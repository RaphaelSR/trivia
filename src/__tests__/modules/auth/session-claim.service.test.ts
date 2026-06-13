/**
 * Testes para os novos serviços de convite genérico da sessão (migration 0006):
 *  - buildSessionClaimUrl
 *  - listClaimableParticipants
 *  - claimParticipantByGame
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import {
  buildSessionClaimUrl,
  listClaimableParticipants,
  claimParticipantByGame,
} from '@/modules/auth/services/normalized-history.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// UUIDs de teste
const VALID_GAME_TOKEN = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
const VALID_PARTICIPANT_ID = '11112222-3333-4444-5555-666677778888'
const JSDOM_ORIGIN = 'http://localhost'

function setBaseUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env['BASE_URL']
  } else {
    process.env['BASE_URL'] = value
  }
}

afterEach(() => {
  delete process.env['BASE_URL']
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// buildSessionClaimUrl
// ---------------------------------------------------------------------------

describe('buildSessionClaimUrl — BASE_URL "/"', () => {
  beforeEach(() => setBaseUrl('/'))

  it('gera URL com ?game= em vez de ?token=', () => {
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    expect(url).toContain(`game=${VALID_GAME_TOKEN}`)
    expect(url).not.toContain('token=')
  })

  it('não produz double-slash (excluindo ://)', () => {
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    const withoutProto = url.replace(/https?:\/\//, '')
    expect(withoutProto).not.toContain('//')
  })

  it('monta URL completa com origin do jsdom', () => {
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    expect(url).toBe(`${JSDOM_ORIGIN}/claim?game=${VALID_GAME_TOKEN}`)
  })
})

describe('buildSessionClaimUrl — BASE_URL "/trivia/"', () => {
  beforeEach(() => setBaseUrl('/trivia/'))

  it('inclui o base path /trivia/', () => {
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    expect(url).toBe(`${JSDOM_ORIGIN}/trivia/claim?game=${VALID_GAME_TOKEN}`)
  })

  it('não duplica a barra entre base e claim', () => {
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    expect(url).not.toContain('//claim')
  })
})

describe('buildSessionClaimUrl — BASE_URL undefined', () => {
  it('usa "/" como fallback', () => {
    setBaseUrl(undefined)
    const url = buildSessionClaimUrl(VALID_GAME_TOKEN)
    expect(url).toBe(`${JSDOM_ORIGIN}/claim?game=${VALID_GAME_TOKEN}`)
  })
})

// ---------------------------------------------------------------------------
// listClaimableParticipants
// ---------------------------------------------------------------------------

describe('listClaimableParticipants — sem config', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna [] sem chamar Supabase', async () => {
    const result = await listClaimableParticipants(VALID_GAME_TOKEN)
    expect(result).toEqual([])
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('listClaimableParticipants — uuid inválido', () => {
  it('retorna [] para token não-uuid', async () => {
    const result = await listClaimableParticipants('not-a-uuid')
    expect(result).toEqual([])
  })
})

describe('listClaimableParticipants — usuário não logado', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
    })
  })

  it('retorna [] sem chamar rpc', async () => {
    const result = await listClaimableParticipants(VALID_GAME_TOKEN)
    expect(result).toEqual([])
  })
})

describe('listClaimableParticipants — logado', () => {
  const fakeSession = { user: { id: 'user-1' } }
  const fakeRows = [
    { participant_id: VALID_PARTICIPANT_ID, display_name: 'Alice', team_name: 'Time A', claimed: false },
    { participant_id: VALID_GAME_TOKEN, display_name: 'Bob', team_name: null, claimed: true },
  ]

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
  })

  it('chama rpc list_claimable_participants com o token correto', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: fakeRows, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      rpc: rpcMock,
    })

    await listClaimableParticipants(VALID_GAME_TOKEN)
    expect(rpcMock).toHaveBeenCalledWith('list_claimable_participants', {
      p_game_token: VALID_GAME_TOKEN,
    })
  })

  it('mapeia as linhas para o formato camelCase correto', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: fakeRows, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      rpc: rpcMock,
    })

    const result = await listClaimableParticipants(VALID_GAME_TOKEN)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      participantId: VALID_PARTICIPANT_ID,
      displayName: 'Alice',
      teamName: 'Time A',
      claimed: false,
    })
    expect(result[1].claimed).toBe(true)
    expect(result[1].teamName).toBeNull()
  })

  it('retorna [] quando rpc retorna erro', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      rpc: rpcMock,
    })

    const result = await listClaimableParticipants(VALID_GAME_TOKEN)
    expect(result).toEqual([])
    warnSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// claimParticipantByGame
// ---------------------------------------------------------------------------

describe('claimParticipantByGame — sem config', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna error sem chamar Supabase', async () => {
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toMatch(/indisponível/i)
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('claimParticipantByGame — uuid inválido', () => {
  it('retorna error para game token não-uuid', async () => {
    const result = await claimParticipantByGame('not-a-uuid', VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toMatch(/inválido/i)
  })

  it('retorna error para participant id não-uuid', async () => {
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, 'not-a-uuid')
    expect(result.gameId).toBeNull()
    expect(result.error).toMatch(/inválido/i)
  })
})

describe('claimParticipantByGame — mapeamento de erros', () => {
  const fakeSession = { user: { id: 'user-1' } }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
  })

  function buildClient(rpcResult: { data: unknown; error: unknown }) {
    return {
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      rpc: jest.fn().mockResolvedValue(rpcResult),
    }
  }

  it('INVALID_TOKEN → mensagem pt-BR correta', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetClient.mockReturnValue(buildClient({ data: null, error: { message: 'INVALID_TOKEN' } }))
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBe('Link de convite inválido.')
    warnSpy.mockRestore()
  })

  it('ALREADY_CLAIMED_IN_GAME → mensagem pt-BR correta', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetClient.mockReturnValue(
      buildClient({ data: null, error: { message: 'ALREADY_CLAIMED_IN_GAME' } }),
    )
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBe('Você já reivindicou um participante nesta partida.')
    warnSpy.mockRestore()
  })

  it('SLOT_UNAVAILABLE → mensagem pt-BR correta', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetClient.mockReturnValue(
      buildClient({ data: null, error: { message: 'SLOT_UNAVAILABLE' } }),
    )
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBe('Esse participante já foi vinculado por outra pessoa.')
    warnSpy.mockRestore()
  })

  it('erro genérico → mensagem genérica pt-BR', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetClient.mockReturnValue(
      buildClient({ data: null, error: { message: 'unexpected db error' } }),
    )
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBeNull()
    expect(result.error).toBe('Não foi possível vincular. Tente novamente.')
    warnSpy.mockRestore()
  })

  it('sucesso → retorna gameId e error=null', async () => {
    mockGetClient.mockReturnValue(buildClient({ data: 'game-uuid-result', error: null }))
    const result = await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(result.gameId).toBe('game-uuid-result')
    expect(result.error).toBeNull()
  })

  it('chama rpc claim_participant_by_game com os parâmetros corretos', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: 'game-uuid-result', error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      rpc: rpcMock,
    })
    await claimParticipantByGame(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
    expect(rpcMock).toHaveBeenCalledWith('claim_participant_by_game', {
      p_game_token: VALID_GAME_TOKEN,
      p_participant_id: VALID_PARTICIPANT_ID,
    })
  })
})
