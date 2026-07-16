import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'

export const PROFILE_AVATAR_BUCKET = 'profile-avatars'
export const PROFILE_AVATAR_SOURCE_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_AVATAR_OUTPUT_MAX_BYTES = 1024 * 1024
export const PROFILE_AVATAR_SIZE = 512

const ACCEPTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ParticipantIdentity = {
  participantClientId: string
  profileId: string
  accountDisplayName: string | null
  avatarPath: string | null
  avatarUpdatedAt: string | null
  avatarUrl: string | null
}

export type ProfileIdentity = Omit<ParticipantIdentity, 'participantClientId'>

type IdentityRow = {
  participant_client_id?: string
  profile_id: string
  display_name?: string | null
  account_display_name?: string | null
  avatar_path: string | null
  avatar_updated_at: string | null
}

export type AvatarMutationResult = {
  identity: ProfileIdentity | null
  error: string | null
}

export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
    return 'Use uma imagem JPEG, PNG ou WebP.'
  }
  if (file.size <= 0 || file.size > PROFILE_AVATAR_SOURCE_MAX_BYTES) {
    return 'A imagem original deve ter no máximo 5 MB.'
  }
  return null
}

export function calculateSquareCrop(width: number, height: number) {
  const side = Math.min(width, height)
  return {
    sourceX: Math.max(0, (width - side) / 2),
    sourceY: Math.max(0, (height - side) / 2),
    sourceSize: side,
  }
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('INVALID_IMAGE'))
  })
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('WEBP_UNAVAILABLE'))
    }, 'image/webp', quality)
  })
}

/** Recorta ao centro, normaliza para 512x512 e reduz ate caber em 1 MB. */
export async function prepareAvatarImage(file: File): Promise<Blob> {
  const validationError = validateAvatarFile(file)
  if (validationError) throw new Error(validationError)

  const image = await loadImage(file)
  try {
    if (image.width <= 0 || image.height <= 0) throw new Error('Imagem inválida.')
    const canvas = document.createElement('canvas')
    canvas.width = PROFILE_AVATAR_SIZE
    canvas.height = PROFILE_AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível processar a imagem.')

    const crop = calculateSquareCrop(image.width, image.height)
    context.drawImage(
      image.source,
      crop.sourceX,
      crop.sourceY,
      crop.sourceSize,
      crop.sourceSize,
      0,
      0,
      PROFILE_AVATAR_SIZE,
      PROFILE_AVATAR_SIZE,
    )

    for (const quality of [0.88, 0.78, 0.68, 0.58, 0.48]) {
      const blob = await canvasToWebp(canvas, quality)
      if (blob.size <= PROFILE_AVATAR_OUTPUT_MAX_BYTES) return blob
    }
    throw new Error('A imagem continuou maior que 1 MB depois da compressão.')
  } finally {
    image.cleanup()
  }
}

function buildAvatarUrl(path: string | null, updatedAt: string | null): string | null {
  if (!path || !isSupabaseConfigured()) return null
  const client = getSupabaseClient()
  if (!client) return null
  const { data } = client.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path)
  if (!data.publicUrl) return null
  const separator = data.publicUrl.includes('?') ? '&' : '?'
  return updatedAt
    ? `${data.publicUrl}${separator}v=${encodeURIComponent(updatedAt)}`
    : data.publicUrl
}

function mapProfileIdentity(row: IdentityRow): ProfileIdentity {
  const avatarUpdatedAt = row.avatar_updated_at ?? null
  return {
    profileId: row.profile_id,
    accountDisplayName: row.account_display_name ?? row.display_name ?? null,
    avatarPath: row.avatar_path ?? null,
    avatarUpdatedAt,
    avatarUrl: buildAvatarUrl(row.avatar_path ?? null, avatarUpdatedAt),
  }
}

function mapParticipantIdentity(row: IdentityRow): ParticipantIdentity | null {
  if (!row.participant_client_id) return null
  return {
    participantClientId: row.participant_client_id,
    ...mapProfileIdentity(row),
  }
}

async function getAuthenticatedContext() {
  if (!isSupabaseConfigured()) return null
  const client = getSupabaseClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  if (!data.session?.user) return null
  return { client, user: data.session.user }
}

export async function getMyProfileIdentity(): Promise<ProfileIdentity | null> {
  const context = await getAuthenticatedContext()
  if (!context) return null
  try {
    const { data, error } = await context.client.rpc('get_my_profile_identity')
    if (error) return null
    const row = (Array.isArray(data) ? data[0] : data) as IdentityRow | null
    return row ? mapProfileIdentity(row) : null
  } catch {
    return null
  }
}

async function listScopedIdentities(
  rpc: 'list_live_participant_identities' | 'list_game_participant_identities',
  params: Record<string, string>,
): Promise<ParticipantIdentity[]> {
  const context = await getAuthenticatedContext()
  if (!context) return []
  try {
    const { data, error } = await context.client.rpc(rpc, params)
    if (error) return []
    return ((data ?? []) as IdentityRow[])
      .map(mapParticipantIdentity)
      .filter((identity): identity is ParticipantIdentity => identity !== null)
  } catch {
    return []
  }
}

export function listLiveParticipantIdentities(sessionClientId: string) {
  if (!sessionClientId.trim()) return Promise.resolve([] as ParticipantIdentity[])
  return listScopedIdentities('list_live_participant_identities', {
    p_session_client_id: sessionClientId,
  })
}

export function listGameParticipantIdentities(gameId: string) {
  if (!gameId.trim()) return Promise.resolve([] as ParticipantIdentity[])
  return listScopedIdentities('list_game_participant_identities', { p_game_id: gameId })
}

async function updateProfileAvatarPath(
  profileId: string,
  avatarPath: string | null,
  avatarUpdatedAt: string | null,
) {
  const client = getSupabaseClient()!
  return client
    .from('profiles')
    .update({ avatar_path: avatarPath, avatar_updated_at: avatarUpdatedAt })
    .eq('id', profileId)
}

/**
 * Upload novo -> perfil -> remove anterior. Qualquer falha restaura o perfil
 * anterior e remove o arquivo novo quando ele ja existir.
 */
export async function uploadPreparedAvatar(blob: Blob): Promise<AvatarMutationResult> {
  if (blob.type !== 'image/webp' || blob.size <= 0 || blob.size > PROFILE_AVATAR_OUTPUT_MAX_BYTES) {
    return { identity: null, error: 'O avatar processado deve ser WebP de até 1 MB.' }
  }
  const context = await getAuthenticatedContext()
  if (!context) return { identity: null, error: 'Entre na sua conta para salvar o avatar.' }

  const previous = await getMyProfileIdentity()
  if (!previous) return { identity: null, error: 'Não foi possível carregar o perfil atual.' }

  const nextPath = `${context.user.id}/${crypto.randomUUID()}.webp`
  const uploaded = await context.client.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(nextPath, blob, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' })
  if (uploaded.error) return { identity: previous, error: 'Não foi possível enviar o avatar.' }

  const updatedAt = new Date().toISOString()
  const profileUpdate = await updateProfileAvatarPath(context.user.id, nextPath, updatedAt)
  if (profileUpdate.error) {
    await context.client.storage.from(PROFILE_AVATAR_BUCKET).remove([nextPath])
    return { identity: previous, error: 'Não foi possível atualizar o perfil.' }
  }

  if (previous.avatarPath) {
    const removePrevious = await context.client.storage
      .from(PROFILE_AVATAR_BUCKET)
      .remove([previous.avatarPath])
    if (removePrevious.error) {
      await updateProfileAvatarPath(
        context.user.id,
        previous.avatarPath,
        previous.avatarUpdatedAt,
      )
      await context.client.storage.from(PROFILE_AVATAR_BUCKET).remove([nextPath])
      return { identity: previous, error: 'Não foi possível concluir a troca. O avatar anterior foi mantido.' }
    }
  }

  return {
    identity: {
      profileId: context.user.id,
      accountDisplayName: previous.accountDisplayName,
      avatarPath: nextPath,
      avatarUpdatedAt: updatedAt,
      avatarUrl: buildAvatarUrl(nextPath, updatedAt),
    },
    error: null,
  }
}

export async function uploadProfileAvatar(file: File): Promise<AvatarMutationResult> {
  const validationError = validateAvatarFile(file)
  if (validationError) return { identity: null, error: validationError }
  try {
    return await uploadPreparedAvatar(await prepareAvatarImage(file))
  } catch (error) {
    return {
      identity: null,
      error: error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
    }
  }
}

export async function removeProfileAvatar(): Promise<AvatarMutationResult> {
  const context = await getAuthenticatedContext()
  if (!context) return { identity: null, error: 'Entre na sua conta para remover o avatar.' }
  const previous = await getMyProfileIdentity()
  if (!previous) return { identity: null, error: 'Não foi possível carregar o perfil atual.' }
  if (!previous.avatarPath) return { identity: previous, error: null }

  const profileUpdate = await updateProfileAvatarPath(context.user.id, null, null)
  if (profileUpdate.error) return { identity: previous, error: 'Não foi possível atualizar o perfil.' }

  const removed = await context.client.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([previous.avatarPath])
  if (removed.error) {
    await updateProfileAvatarPath(
      context.user.id,
      previous.avatarPath,
      previous.avatarUpdatedAt,
    )
    return { identity: previous, error: 'Não foi possível remover agora. O avatar anterior foi mantido.' }
  }

  return {
    identity: { ...previous, avatarPath: null, avatarUpdatedAt: null, avatarUrl: null },
    error: null,
  }
}
