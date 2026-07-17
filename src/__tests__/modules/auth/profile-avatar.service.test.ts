jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import {
  calculateAvatarCrop,
  calculateSquareCrop,
  listLiveParticipantIdentities,
  PROFILE_AVATAR_OUTPUT_MAX_BYTES,
  PROFILE_AVATAR_OUTPUT_TARGET_BYTES,
  PROFILE_AVATAR_SOURCE_MAX_BYTES,
  prepareAvatarImage,
  removeProfileAvatar,
  uploadPreparedAvatar,
  validateAvatarFile,
} from '@/modules/auth/services/profile-avatar.service'
import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'

const mockConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock
const USER_ID = '11111111-1111-4111-8111-111111111111'
const AVATAR_ID = '22222222-2222-4222-8222-222222222222'

function createClient(options?: {
  rpcData?: unknown
  uploadError?: unknown
  removeResults?: Array<{ error: unknown }>
  updateResults?: Array<{ error: unknown }>
}) {
  const rpc = jest.fn().mockResolvedValue({ data: options?.rpcData ?? [], error: null })
  const upload = jest.fn().mockResolvedValue({ data: { path: 'ok' }, error: options?.uploadError ?? null })
  const remove = jest.fn()
  for (const result of options?.removeResults ?? [{ error: null }]) {
    remove.mockResolvedValueOnce(result)
  }
  const getPublicUrl = jest.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }))
  const eq = jest.fn()
  for (const result of options?.updateResults ?? [{ error: null }]) {
    eq.mockResolvedValueOnce(result)
  }
  const update = jest.fn(() => ({ eq }))
  const client = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: USER_ID } } },
      }),
    },
    rpc,
    storage: {
      from: jest.fn(() => ({ upload, remove, getPublicUrl })),
    },
    from: jest.fn(() => ({ update })),
  }
  return { client, rpc, upload, remove, update, eq }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockConfigured.mockReturnValue(true)
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: jest.fn(() => AVATAR_ID),
  })
})

it('valida formato/tamanho de origem e calcula crop central', () => {
  expect(validateAvatarFile({ type: 'image/jpeg', size: PROFILE_AVATAR_SOURCE_MAX_BYTES })).toBeNull()
  expect(validateAvatarFile({ type: 'image/gif', size: 100 })).toMatch(/JPEG, PNG ou WebP/)
  expect(validateAvatarFile({ type: 'image/png', size: PROFILE_AVATAR_SOURCE_MAX_BYTES + 1 })).toMatch(/5 MB/)
  expect(calculateSquareCrop(1200, 800)).toEqual({ sourceX: 200, sourceY: 0, sourceSize: 800 })
  expect(calculateSquareCrop(600, 1000)).toEqual({ sourceX: 0, sourceY: 200, sourceSize: 600 })
})

it('aplica zoom e limita o ponto focal para o recorte nunca sair da imagem', () => {
  expect(calculateAvatarCrop(1200, 800, {
    zoom: 2,
    focusX: 0.75,
    focusY: 0.25,
  })).toEqual({ sourceX: 700, sourceY: 0, sourceSize: 400 })

  expect(calculateAvatarCrop(600, 1000, {
    zoom: 3,
    focusX: -10,
    focusY: 10,
  })).toEqual({ sourceX: 0, sourceY: 800, sourceSize: 200 })
})

it('recorta 512x512 e reduz qualidade ate o WebP caber em 1 MB', async () => {
  const drawImage = jest.fn()
  const toBlob = jest.fn((callback: BlobCallback, _type?: string, quality?: number) => {
    const size = (quality ?? 1) > 0.8 ? PROFILE_AVATAR_OUTPUT_TARGET_BYTES + 10 : 128
    callback(new Blob([new Uint8Array(size)], { type: 'image/webp' }))
  })
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => ({ drawImage })),
    toBlob,
  } as unknown as HTMLCanvasElement
  const realCreateElement = document.createElement.bind(document)
  const createElement = jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => (
    tag === 'canvas' ? fakeCanvas : realCreateElement(tag)
  )) as typeof document.createElement)
  const close = jest.fn()
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: jest.fn().mockResolvedValue({ width: 1200, height: 800, close }),
  })

  try {
    const result = await prepareAvatarImage(new File(['image'], 'source.png', { type: 'image/png' }))
    expect(fakeCanvas.width).toBe(512)
    expect(fakeCanvas.height).toBe(512)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 200, 0, 800, 800, 0, 0, 512, 512)
    expect(toBlob).toHaveBeenCalledTimes(2)
    expect(result.type).toBe('image/webp')
    expect(result.size).toBe(128)
    expect(close).toHaveBeenCalled()
  } finally {
    createElement.mockRestore()
    Reflect.deleteProperty(globalThis, 'createImageBitmap')
  }
})

it('nao chama Supabase quando identidade online esta desabilitada', async () => {
  mockConfigured.mockReturnValue(false)
  await expect(listLiveParticipantIdentities('session-1')).resolves.toEqual([])
  expect(mockGetClient).not.toHaveBeenCalled()
})

it('mapeia somente identidades retornadas pela RPC escopada', async () => {
  const { client, rpc } = createClient({
    rpcData: [{
      participant_client_id: 'p1',
      profile_id: USER_ID,
      account_display_name: 'Conta',
      avatar_path: `${USER_ID}/${AVATAR_ID}.webp`,
      avatar_updated_at: '2026-07-16T00:00:00.000Z',
    }],
  })
  mockGetClient.mockReturnValue(client)

  const result = await listLiveParticipantIdentities('session-1')

  expect(rpc).toHaveBeenCalledWith('list_live_participant_identities', {
    p_session_client_id: 'session-1',
  })
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ participantClientId: 'p1', profileId: USER_ID })
  expect(result[0].avatarUrl).toContain(`${USER_ID}/${AVATAR_ID}.webp`)
  expect(result[0].avatarUrl).toContain('?v=')
})

it('faz upload WebP, atualiza perfil e devolve URL versionada', async () => {
  const { client, upload, update } = createClient({
    rpcData: [{
      profile_id: USER_ID,
      display_name: 'Conta',
      avatar_path: null,
      avatar_updated_at: null,
    }],
  })
  mockGetClient.mockReturnValue(client)
  const blob = new Blob(['avatar'], { type: 'image/webp' })

  const result = await uploadPreparedAvatar(blob)

  expect(result.error).toBeNull()
  expect(upload).toHaveBeenCalledWith(
    `${USER_ID}/${AVATAR_ID}.webp`,
    blob,
    expect.objectContaining({ contentType: 'image/webp', upsert: false }),
  )
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    avatar_path: `${USER_ID}/${AVATAR_ID}.webp`,
  }))
  expect(result.identity?.avatarUrl).toContain(`${AVATAR_ID}.webp`)
})

it('restaura avatar anterior se a exclusao antiga falhar', async () => {
  const previousPath = `${USER_ID}/33333333-3333-4333-8333-333333333333.webp`
  const { client, remove, update } = createClient({
    rpcData: [{
      profile_id: USER_ID,
      display_name: 'Conta',
      avatar_path: previousPath,
      avatar_updated_at: '2026-07-15T00:00:00.000Z',
    }],
    removeResults: [{ error: { message: 'offline' } }, { error: null }],
    updateResults: [{ error: null }, { error: null }],
  })
  mockGetClient.mockReturnValue(client)

  const result = await uploadPreparedAvatar(new Blob(['avatar'], { type: 'image/webp' }))

  expect(result.error).toMatch(/avatar anterior foi mantido/i)
  expect(result.identity?.avatarPath).toBe(previousPath)
  expect(remove).toHaveBeenNthCalledWith(1, [previousPath])
  expect(remove).toHaveBeenNthCalledWith(2, [`${USER_ID}/${AVATAR_ID}.webp`])
  expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ avatar_path: previousPath }))
})

it('restaura o caminho anterior se remover o arquivo falhar', async () => {
  const previousPath = `${USER_ID}/33333333-3333-4333-8333-333333333333.webp`
  const { client, update } = createClient({
    rpcData: [{
      profile_id: USER_ID,
      display_name: 'Conta',
      avatar_path: previousPath,
      avatar_updated_at: '2026-07-15T00:00:00.000Z',
    }],
    removeResults: [{ error: { message: 'offline' } }],
    updateResults: [{ error: null }, { error: null }],
  })
  mockGetClient.mockReturnValue(client)

  const result = await removeProfileAvatar()

  expect(result.error).toMatch(/avatar anterior foi mantido/i)
  expect(result.identity?.avatarPath).toBe(previousPath)
  expect(update).toHaveBeenNthCalledWith(1, { avatar_path: null, avatar_updated_at: null })
  expect(update).toHaveBeenNthCalledWith(2, {
    avatar_path: previousPath,
    avatar_updated_at: '2026-07-15T00:00:00.000Z',
  })
})

it('rejeita blob processado acima de 1 MB antes da rede', async () => {
  const blob = new Blob([new Uint8Array(PROFILE_AVATAR_OUTPUT_MAX_BYTES + 1)], { type: 'image/webp' })
  const result = await uploadPreparedAvatar(blob)
  expect(result.error).toMatch(/até 1 MB/)
  expect(mockGetClient).not.toHaveBeenCalled()
})
