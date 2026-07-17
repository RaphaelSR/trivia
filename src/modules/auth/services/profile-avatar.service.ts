import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'
import { i18n } from '@/shared/i18n'

export const PROFILE_AVATAR_BUCKET = 'profile-avatars'
export const PROFILE_AVATAR_SOURCE_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_AVATAR_OUTPUT_MAX_BYTES = 1024 * 1024
export const PROFILE_AVATAR_OUTPUT_TARGET_BYTES = 350 * 1024
export const PROFILE_AVATAR_SIZE = 512
export const PROFILE_AVATAR_MAX_ZOOM = 3

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

export type AvatarCrop = {
  /** 1 = maior quadrado central possivel; 3 = aproximacao maxima da UI. */
  zoom: number
  /** Ponto focal normalizado na imagem original. */
  focusX: number
  focusY: number
}

export const DEFAULT_AVATAR_CROP: AvatarCrop = {
  zoom: 1,
  focusX: 0.5,
  focusY: 0.5,
}

export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
    return i18n.t('auth:services.avatar.invalidType')
  }
  if (file.size <= 0 || file.size > PROFILE_AVATAR_SOURCE_MAX_BYTES) {
    return i18n.t('auth:services.avatar.sourceTooLarge')
  }
  return null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeAvatarCrop(
  width: number,
  height: number,
  crop: AvatarCrop,
): AvatarCrop {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, 1, PROFILE_AVATAR_MAX_ZOOM)
  const sourceSize = Math.min(safeWidth, safeHeight) / zoom
  const halfX = sourceSize / (2 * safeWidth)
  const halfY = sourceSize / (2 * safeHeight)

  return {
    zoom,
    focusX: clamp(Number.isFinite(crop.focusX) ? crop.focusX : 0.5, halfX, 1 - halfX),
    focusY: clamp(Number.isFinite(crop.focusY) ? crop.focusY : 0.5, halfY, 1 - halfY),
  }
}

export function calculateAvatarCrop(
  width: number,
  height: number,
  crop: AvatarCrop = DEFAULT_AVATAR_CROP,
) {
  const normalized = normalizeAvatarCrop(width, height, crop)
  const side = Math.min(width, height) / normalized.zoom
  return {
    sourceX: normalized.focusX * width - side / 2,
    sourceY: normalized.focusY * height - side / 2,
    sourceSize: side,
  }
}

export function calculateSquareCrop(width: number, height: number) {
  return calculateAvatarCrop(width, height)
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

/** Aplica o recorte escolhido, normaliza para 512x512 e gera WebP leve. */
export async function prepareAvatarImage(
  file: File,
  crop: AvatarCrop = DEFAULT_AVATAR_CROP,
): Promise<Blob> {
  const validationError = validateAvatarFile(file)
  if (validationError) throw new Error(validationError)

  const image = await loadImage(file)
  try {
    if (image.width <= 0 || image.height <= 0) throw new Error(i18n.t('auth:services.avatar.invalidImage'))
    const canvas = document.createElement('canvas')
    canvas.width = PROFILE_AVATAR_SIZE
    canvas.height = PROFILE_AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error(i18n.t('auth:services.avatar.processingFailed'))

    const cropRect = calculateAvatarCrop(image.width, image.height, crop)
    context.drawImage(
      image.source,
      cropRect.sourceX,
      cropRect.sourceY,
      cropRect.sourceSize,
      cropRect.sourceSize,
      0,
      0,
      PROFILE_AVATAR_SIZE,
      PROFILE_AVATAR_SIZE,
    )

    let smallestBlob: Blob | null = null
    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46]) {
      const blob = await canvasToWebp(canvas, quality)
      smallestBlob = blob
      if (blob.size <= PROFILE_AVATAR_OUTPUT_TARGET_BYTES) return blob
    }
    if (smallestBlob && smallestBlob.size <= PROFILE_AVATAR_OUTPUT_MAX_BYTES) return smallestBlob
    throw new Error(i18n.t('auth:services.avatar.compressedTooLarge'))
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
    return { identity: null, error: i18n.t('auth:services.avatar.invalidProcessed') }
  }
  const context = await getAuthenticatedContext()
  if (!context) return { identity: null, error: i18n.t('auth:services.avatar.signInToSave') }

  const previous = await getMyProfileIdentity()
  if (!previous) return { identity: null, error: i18n.t('auth:services.avatar.loadProfileFailed') }

  const nextPath = `${context.user.id}/${crypto.randomUUID()}.webp`
  const uploaded = await context.client.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(nextPath, blob, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' })
  if (uploaded.error) return { identity: previous, error: i18n.t('auth:services.avatar.uploadFailed') }

  const updatedAt = new Date().toISOString()
  const profileUpdate = await updateProfileAvatarPath(context.user.id, nextPath, updatedAt)
  if (profileUpdate.error) {
    await context.client.storage.from(PROFILE_AVATAR_BUCKET).remove([nextPath])
    return { identity: previous, error: i18n.t('auth:services.avatar.updateProfileFailed') }
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
      return { identity: previous, error: i18n.t('auth:services.avatar.replaceRollback') }
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
      error: error instanceof Error ? error.message : i18n.t('auth:services.avatar.processingFailed'),
    }
  }
}

export async function removeProfileAvatar(): Promise<AvatarMutationResult> {
  const context = await getAuthenticatedContext()
  if (!context) return { identity: null, error: i18n.t('auth:services.avatar.signInToRemove') }
  const previous = await getMyProfileIdentity()
  if (!previous) return { identity: null, error: i18n.t('auth:services.avatar.loadProfileFailed') }
  if (!previous.avatarPath) return { identity: previous, error: null }

  const profileUpdate = await updateProfileAvatarPath(context.user.id, null, null)
  if (profileUpdate.error) return { identity: previous, error: i18n.t('auth:services.avatar.updateProfileFailed') }

  const removed = await context.client.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([previous.avatarPath])
  if (removed.error) {
    await updateProfileAvatarPath(
      context.user.id,
      previous.avatarPath,
      previous.avatarUpdatedAt,
    )
    return { identity: previous, error: i18n.t('auth:services.avatar.removeRollback') }
  }

  return {
    identity: { ...previous, avatarPath: null, avatarUpdatedAt: null, avatarUrl: null },
    error: null,
  }
}
