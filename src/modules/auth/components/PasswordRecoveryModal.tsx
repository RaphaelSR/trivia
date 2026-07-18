/**
 * PasswordRecoveryModal
 *
 * Montado no App (acima do router): quando o usuário abre o app pelo link do
 * e-mail "redefinir senha", o supabase-js troca o token da URL por uma sessão
 * temporária e dispara PASSWORD_RECOVERY — este modal assume em qualquer rota
 * e pede a nova senha. Fora desse evento, não renderiza nada.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { onAuthStateChange, updatePassword } from '../services/auth.service'
import { useTranslation } from '@/shared/i18n'

const MIN_PASSWORD_LENGTH = 8

export function PasswordRecoveryModal() {
  const { t } = useTranslation(['auth', 'common'])
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Um toggle só para os dois campos: o objetivo é conferir o que digitou.
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    return onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setOpen(true)
      }
    })
  }, [])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('recovery.tooShort', { ns: 'auth', count: MIN_PASSWORD_LENGTH }))
      return
    }
    if (password !== confirm) {
      setError(t('recovery.mismatch', { ns: 'auth' }))
      return
    }

    setSaving(true)
    const { error: err } = await updatePassword(password)
    setSaving(false)

    if (err) {
      setError(err)
      return
    }

    toast.success(t('recovery.success', { ns: 'auth' }))
    setOpen(false)
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold text-zinc-100">{t('recovery.title', { ns: 'auth' })}</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          {t('recovery.description', { ns: 'auth' })}
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <div>
            <label htmlFor="recovery-password" className="mb-1 block text-xs text-zinc-400">{t('recovery.newPassword', { ns: 'auth' })}</label>
            <div className="relative">
              <input
                id="recovery-password"
                name="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('recovery.minimum', { ns: 'auth', count: MIN_PASSWORD_LENGTH })}
                autoComplete="new-password"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-10 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
              />
              <button
                type="button"
                aria-label={showPasswords ? t('recovery.hidePasswords', { ns: 'auth' }) : t('recovery.showPasswords', { ns: 'auth' })}
                onClick={() => setShowPasswords((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-100"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="recovery-confirm" className="mb-1 block text-xs text-zinc-400">{t('recovery.confirmPassword', { ns: 'auth' })}</label>
            <input
              id="recovery-confirm"
              name="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('recovery.repeat', { ns: 'auth' })}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t('actions.saving', { ns: 'common' }) : t('recovery.save', { ns: 'auth' })}
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-100"
          >
            {t('recovery.later', { ns: 'auth' })}
          </button>
        </form>
      </div>
    </div>
  )
}
