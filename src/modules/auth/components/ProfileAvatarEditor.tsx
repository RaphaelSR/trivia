import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import {
  getMyProfileIdentity,
  removeProfileAvatar,
  uploadProfileAvatar,
  type ProfileIdentity,
} from '../services/profile-avatar.service'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [identity, setIdentity] = useState<ProfileIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleFile(file: File | undefined) {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    const result = await uploadProfileAvatar(file)
    setBusy(false)
    if (result.error) setError(result.error)
    applyIdentity(result.identity)
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
    <div className={claim ? 'rounded-xl border border-white/10 bg-white/5 p-4' : 'flex flex-col items-center gap-2'}>
      <div className={claim ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'}>
        <div className="relative">
          <ParticipantAvatar name={name} src={identity?.avatarUrl} size={claim ? 52 : 72} />
          {loading || busy ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-label="Atualizando avatar" />
            </span>
          ) : null}
        </div>
        {claim ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--color-text)]">Quer adicionar uma foto?</p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
              Opcional. A imagem fica no seu perfil e não altera seu nome na partida.
            </p>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Selecionar avatar"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className={claim ? 'mt-3 flex flex-wrap gap-2' : 'flex flex-wrap justify-center gap-2'}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} /> {identity?.avatarPath ? 'Trocar foto' : 'Adicionar foto'}
        </Button>
        {identity?.avatarPath ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            <Trash2 size={14} /> Remover
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="status" className={claim ? 'mt-2 text-xs text-red-400' : 'text-center text-xs text-red-400'}>
          {error}
        </p>
      ) : null}
      {!claim ? (
        <p className="text-center text-[10px] text-zinc-500">JPEG, PNG ou WebP · até 5 MB</p>
      ) : null}
    </div>
  )
}
