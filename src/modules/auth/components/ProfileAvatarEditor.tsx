import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import {
  getMyProfileIdentity,
  prepareAvatarImage,
  removeProfileAvatar,
  uploadPreparedAvatar,
  validateAvatarFile,
  type AvatarCrop,
  type AvatarMutationResult,
  type ProfileIdentity,
} from '../services/profile-avatar.service'
import { useTranslation } from '@/shared/i18n'
import { AvatarCropModal } from './AvatarCropModal'

type ProfileAvatarEditorProps = {
  name: string
  variant?: 'account' | 'claim'
  onChanged?: (identity: ProfileIdentity) => void
}

export function ProfileAvatarEditor({
  name,
  variant = 'account',
  onChanged,
}: ProfileAvatarEditorProps) {
  const { t } = useTranslation(['auth', 'common'])
  const inputRef = useRef<HTMLInputElement>(null)
  const [identity, setIdentity] = useState<ProfileIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropError, setCropError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getMyProfileIdentity().then((profile) => {
      if (!cancelled) {
        setIdentity(profile)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function applyIdentity(profile: ProfileIdentity | null) {
    if (!profile) return
    setIdentity(profile)
    onChanged?.(profile)
  }

  function handleFile(file: File | undefined) {
    if (!file || busy) return
    const validationError = validateAvatarFile(file)
    if (validationError) {
      setError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setError(null)
    setCropError(null)
    setCropFile(file)
  }

  async function handleCropConfirm(crop: AvatarCrop) {
    if (!cropFile || busy) return
    setBusy(true)
    setCropError(null)
    let result: AvatarMutationResult
    try {
      const prepared = await prepareAvatarImage(cropFile, crop)
      result = await uploadPreparedAvatar(prepared)
    } catch (processingError) {
      setBusy(false)
      setCropError(
        processingError instanceof Error
          ? processingError.message
          : t('services.avatar.processingFailed', { ns: 'auth' }),
      )
      return
    }
    setBusy(false)
    if (result.error) {
      setCropError(result.error)
      applyIdentity(result.identity)
      return
    }
    applyIdentity(result.identity)
    setCropFile(null)
    setCropError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleCropCancel() {
    if (busy) return
    setCropFile(null)
    setCropError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await removeProfileAvatar()
    setBusy(false)
    if (result.error) setError(result.error)
    applyIdentity(result.identity)
  }

  const claim = variant === 'claim'

  return (
    <div className={claim ? 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4' : 'flex flex-col items-center gap-2'}>
      <div className={claim ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'}>
        <div className="relative">
          <ParticipantAvatar name={name} src={identity?.avatarUrl} size={claim ? 52 : 72} />
          {loading || busy ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-label={t('avatar.updating', { ns: 'auth' })} />
            </span>
          ) : null}
        </div>
        {claim ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--color-text)]">{t('avatar.claimTitle', { ns: 'auth' })}</p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
              {t('avatar.claimDescription', { ns: 'auth' })}
            </p>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={t('avatar.select', { ns: 'auth' })}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className={claim ? 'mt-3 flex flex-wrap gap-2' : 'flex flex-wrap justify-center gap-2'}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} /> {identity?.avatarPath ? t('avatar.change', { ns: 'auth' }) : t('avatar.add', { ns: 'auth' })}
        </Button>
        {identity?.avatarPath ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            <Trash2 size={14} /> {t('actions.remove', { ns: 'common' })}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="status" className={claim ? 'mt-2 text-xs text-red-400' : 'text-center text-xs text-red-400'}>
          {error}
        </p>
      ) : null}
      {!claim ? (
        <p className="text-center text-[10px] text-zinc-500">{t('avatar.formats', { ns: 'auth' })}</p>
      ) : null}

      {cropFile ? (
        <AvatarCropModal
          file={cropFile}
          busy={busy}
          error={cropError}
          onCancel={handleCropCancel}
          onConfirm={(crop) => void handleCropConfirm(crop)}
        />
      ) : null}
    </div>
  )
}
