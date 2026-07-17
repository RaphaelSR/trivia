import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Eye, EyeOff, LogOut, Trash2, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'
import { listNormalizedGames } from '../services/normalized-history.service'
import type { NormalizedGameSummary } from '../services/normalized-history.service'
import { ImportLocalSessions } from './ImportLocalSessions'
import { GameDetailView } from './GameDetailView'
import { isValidEmail } from '@/shared/utils/email'
import { DeleteGameDialog } from './DeleteGameDialog'
import { ProfileAvatarEditor } from './ProfileAvatarEditor'
import { useTranslation } from '@/shared/i18n'

type Tab = 'signin' | 'signup'

const RESEND_COOLDOWN_SECONDS = 30

/** Cooldown do link de redefinição — o Supabase só aceita 1 pedido por endereço a cada 60s. */
const RESET_COOLDOWN_SECONDS = 60

interface AuthPanelProps {
  onClose: () => void
  /** Aba inicial ao abrir o painel (default: 'signin'). */
  initialTab?: Tab
}

// ---------------------------------------------------------------------------
// LoggedInPanel — exibido quando há usuário autenticado
// ---------------------------------------------------------------------------

interface LoggedInPanelProps {
  user: User
  loading: boolean
  onLogout: () => Promise<void>
  onClose: () => void
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function buildScoreLine(entry: NormalizedGameSummary): string {
  if (entry.teams.length === 0) return ''
  return entry.teams.map((t) => `${t.name} ${t.score}`).join(' × ')
}

function LoggedInPanel({ user, loading, onLogout, onClose }: LoggedInPanelProps) {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const name =
    (user.user_metadata as Record<string, string> | undefined)?.display_name ??
    user.email?.split('@')[0] ??
    t('form.userFallback', { ns: 'auth' })

  const [history, setHistory] = useState<NormalizedGameSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(false)

    listNormalizedGames()
      .then((entries) => {
        if (!cancelled) {
          setHistory(entries)
          setHistoryLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError(true)
          setHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [user.id])

  const handleHistoryRefresh = useCallback((entries: NormalizedGameSummary[]) => {
    setHistory(entries)
  }, [])

  const handleDeleteSuccess = useCallback((deletedId: string) => {
    setHistory((prev) => prev.filter((g) => g.id !== deletedId))
    setDeleteTarget(null)
  }, [])

  // Detalhe da partida selecionada
  if (selectedGameId !== null) {
    return (
      <GameDetailView
        gameId={selectedGameId}
        onBack={() => setSelectedGameId(null)}
      />
    )
  }

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label={t('form.close', { ns: 'auth' })}
        onClick={onClose}
        className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Cabeçalho do usuário */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <ProfileAvatarEditor name={name} />
        <p className="text-sm font-medium text-zinc-100">{name}</p>
        <p className="text-xs text-zinc-400">{user.email}</p>
        <button
          onClick={onLogout}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {loading ? t('panel.signingOut', { ns: 'auth' }) : t('panel.signOut', { ns: 'auth' })}
        </button>
      </div>

      {/* Separador */}
      <div className="my-2 h-px bg-white/10" />

      {/* Seção: Importar sessões locais */}
      <ImportLocalSessions user={user} onHistoryRefresh={handleHistoryRefresh} />

      {/* Separador */}
      <div className="my-2 h-px bg-white/10" />

      {/* Seção: Minhas partidas */}
      <section aria-label={t('panel.myGames', { ns: 'auth' })}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {t('panel.myGames', { ns: 'auth' })}
        </p>

        {historyLoading && (
          <p className="text-xs text-zinc-400" aria-live="polite">
            {t('panel.loadingHistory', { ns: 'auth' })}
          </p>
        )}

        {!historyLoading && historyError && (
          <p className="text-xs text-zinc-400" aria-live="polite">
            {t('panel.historyError', { ns: 'auth' })}
          </p>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p className="text-xs text-zinc-400" aria-live="polite">
            {t('panel.historyEmpty', { ns: 'auth' })}
          </p>
        )}

        {!historyLoading && !historyError && history.length > 0 && (
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1" role="list">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-stretch gap-1">
                <button
                  onClick={() => setSelectedGameId(entry.id)}
                  className="min-w-0 flex-1 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/8"
                  aria-label={t('panel.viewGame', { ns: 'auth', title: entry.title })}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-100">
                      {entry.title}
                    </p>
                    {entry.source === 'import' && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-zinc-400">
                        {t('panel.imported', { ns: 'auth' })}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs text-zinc-400">
                      {formatDate(entry.playedAt ?? entry.endedAt ?? '', i18n.resolvedLanguage ?? i18n.language)}
                    </span>
                    {entry.winner != null && (
                      <span className="text-xs text-[var(--color-primary)]">
                        {entry.winner}
                      </span>
                    )}
                    {entry.winner == null && (
                      <span className="text-xs text-zinc-400">{t('panel.tie', { ns: 'auth' })}</span>
                    )}
                  </div>
                  {buildScoreLine(entry) && (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {buildScoreLine(entry)}
                    </p>
                  )}
                </button>
                {/* Botão de exclusão por partida */}
                <button
                  onClick={() => setDeleteTarget({ id: entry.id, title: entry.title })}
                  aria-label={t('panel.deleteGame', { ns: 'auth', title: entry.title })}
                  className="flex shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 px-2 text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Diálogo de exclusão com confirmação de senha */}
      {deleteTarget && (
        <DeleteGameDialog
          gameId={deleteTarget.id}
          gameTitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => handleDeleteSuccess(deleteTarget.id)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AuthPanel — ponto de entrada público
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ConfirmationPendingPanel — exibido após signup sem sessão imediata
// ---------------------------------------------------------------------------

interface ConfirmationPendingPanelProps {
  email: string
  onClose: () => void
  onResend: (email: string) => Promise<string | null>
}

function ConfirmationPendingPanel({ email, onClose, onResend }: ConfirmationPendingPanelProps) {
  const { t } = useTranslation('auth')
  const [cooldown, setCooldown] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [])

  async function handleResend() {
    setResendError(null)

    const err = await onResend(email)
    if (err) {
      setResendError(err)
      return
    }

    setCooldown(RESEND_COOLDOWN_SECONDS)

    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current)
          intervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label={t('form.close')}
        onClick={onClose}
        className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-4 pt-2">
        <p className="text-sm font-semibold text-zinc-100">{t('confirmation.title')}</p>
        <p className="text-sm leading-relaxed text-zinc-400">
          {t('confirmation.description', { email })}
        </p>

        {resendError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {resendError}
          </p>
        )}

        <button
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0
            ? t('confirmation.resentCooldown', { seconds: cooldown })
            : t('confirmation.resend')}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ForgotPasswordPanel — tela dedicada de redefinição de senha
// ---------------------------------------------------------------------------

interface ForgotPasswordPanelProps {
  /** E-mail pré-preenchido vindo do formulário de login. */
  initialEmail: string
  onBack: () => void
  onClose: () => void
  onRequestReset: (email: string) => Promise<string | null>
}

function ForgotPasswordPanel({ initialEmail, onBack, onClose, onRequestReset }: ForgotPasswordPanelProps) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [])

  function startCooldown() {
    setCooldown(RESET_COOLDOWN_SECONDS)
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current)
          intervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setError(t('form.invalidEmail'))
      return
    }

    setSending(true)
    const err = await onRequestReset(email)
    setSending(false)

    if (err) {
      setError(err)
      return
    }

    setSentTo(email)
    startCooldown()
  }

  const buttonLabel = sending
    ? t('passwordReset.sending')
    : sentTo
      ? cooldown > 0
        ? t('passwordReset.sentCooldown', { seconds: cooldown })
        : t('passwordReset.resend')
      : t('passwordReset.send')

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label={t('form.close')}
        onClick={onClose}
        className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>

      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('passwordReset.back')}
      </button>

      <h2 className="text-lg font-semibold text-zinc-100">{t('passwordReset.title')}</h2>
      <p className="mt-1.5 mb-4 text-sm leading-relaxed text-zinc-400">
        {t('passwordReset.description')}
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-xs text-zinc-400">
            {t('form.email')}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.emailPlaceholder')}
            autoComplete="email"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {sentTo && !error && (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-400">
            {t('passwordReset.sentMessage', { email: sentTo })}
          </p>
        )}

        <button
          type="submit"
          disabled={sending || cooldown > 0}
          className="mt-1 w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AuthPanel — ponto de entrada público
// ---------------------------------------------------------------------------

export function AuthPanel({ onClose, initialTab = 'signin' }: AuthPanelProps) {
  const { t } = useTranslation('auth')
  const { user, loading, login, register, logout, resend, requestReset } = useAuth()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Guarda o email pendente de confirmação; null = sem confirmação pendente
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  // Tela dedicada de "esqueci minha senha" (só e-mail, sem campo de senha)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function validate(): string | null {
    if (!isValidEmail(email)) return t('form.invalidEmail')
    if (password.length < 8) return t('form.shortPassword')
    if (tab === 'signup' && displayName.trim().length === 0) return t('form.missingDisplayName')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (tab === 'signin') {
      const err = await login(email, password)
      if (err) setError(err)
    } else {
      const submittedEmail = email
      const err = await register(submittedEmail, password, displayName.trim())
      if (err) {
        setError(err)
      } else {
        // Signup sem sessão imediata = confirmação de e-mail pendente
        setPendingEmail(submittedEmail)
        setEmail('')
        setPassword('')
        setDisplayName('')
      }
    }
  }

  async function handleLogout() {
    setError(null)
    await logout()
  }

  function switchTab(next: Tab) {
    setTab(next)
    setError(null)
    setPendingEmail(null)
  }

  // Se a sessão apareceu (usuário voltou do link de confirmação),
  // o painel de confirmação pendente é descartado automaticamente.
  if (user) {
    return <LoggedInPanel user={user} loading={loading} onLogout={handleLogout} onClose={onClose} />
  }

  // Confirmação de e-mail pendente
  if (pendingEmail !== null) {
    return (
      <ConfirmationPendingPanel
        email={pendingEmail}
        onClose={onClose}
        onResend={resend}
      />
    )
  }

  // Fluxo de redefinição de senha — tela própria, sem campo de senha
  if (forgotOpen) {
    return (
      <ForgotPasswordPanel
        initialEmail={email}
        onBack={() => setForgotOpen(false)}
        onClose={onClose}
        onRequestReset={requestReset}
      />
    )
  }

  // Painel de login / cadastro
  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label={t('form.close')}
        onClick={onClose}
        className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        {(['signin', 'signup'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => switchTab(tabKey)}
            className={[
              'flex-1 rounded-lg py-1.5 text-sm font-medium transition-all',
              tab === tabKey
                ? 'bg-white/10 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100',
            ].join(' ')}
          >
            {tabKey === 'signin' ? t('panel.signIn') : t('panel.signUp')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        {tab === 'signup' && (
          <div>
            <label htmlFor="auth-display-name" className="mb-1 block text-xs text-zinc-400">{t('form.displayName')}</label>
            <input
              id="auth-display-name"
              name="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('form.displayNamePlaceholder')}
              maxLength={40}
              autoComplete="name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1 block text-xs text-zinc-400">{t('form.email')}</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('form.emailPlaceholder')}
            autoComplete={tab === 'signin' ? 'username' : 'email'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="auth-password" className="block text-xs text-zinc-400">{t('form.password')}</label>
            {tab === 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setForgotOpen(true)
                }}
                className="text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-100 hover:underline"
              >
                {t('panel.forgotPassword')}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signin' ? '••••••••' : t('form.minimumPassword')}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-10 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
            />
            <button
              type="button"
              aria-label={showPassword ? t('form.hidePassword') : t('form.showPassword')}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? tab === 'signin'
              ? t('panel.signingIn')
              : t('panel.signingUp')
            : tab === 'signin'
              ? t('panel.signIn')
              : t('panel.signUp')}
        </button>
      </form>
    </div>
  )
}
