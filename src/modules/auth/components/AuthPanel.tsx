import { useState, useEffect, useRef } from 'react'
import { LogOut, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'
import { listNormalizedGames } from '../services/normalized-history.service'
import type { NormalizedGameSummary } from '../services/normalized-history.service'

type Tab = 'signin' | 'signup'

const RESEND_COOLDOWN_SECONDS = 30

interface AuthPanelProps {
  onClose: () => void
  /** Aba inicial ao abrir o painel (default: 'signin'). */
  initialTab?: Tab
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

function formatDatePtBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
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
  const name =
    (user.user_metadata as Record<string, string> | undefined)?.display_name ??
    user.email?.split('@')[0] ??
    'Usuário'

  const [history, setHistory] = useState<NormalizedGameSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)

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

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-4 top-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Cabeçalho do usuário */}
      <div className="flex flex-col items-center gap-3 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-lg font-semibold text-[var(--color-primary)]">
          {name.charAt(0).toUpperCase()}
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">{name}</p>
        <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
        <button
          onClick={onLogout}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-white/20 hover:text-[var(--color-text)] disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {loading ? 'Saindo…' : 'Sair'}
        </button>
      </div>

      {/* Separador */}
      <div className="my-2 h-px bg-white/10" />

      {/* Seção: Minhas partidas */}
      <section aria-label="Minhas partidas">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Minhas partidas
        </p>

        {historyLoading && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            Carregando…
          </p>
        )}

        {!historyLoading && historyError && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            Não foi possível carregar o histórico.
          </p>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            Nenhuma partida registrada ainda.
          </p>
        )}

        {!historyLoading && !historyError && history.length > 0 && (
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1" role="list">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-white/5 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text)]">
                    {entry.title}
                  </p>
                  {entry.source === 'import' && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-[var(--color-muted)]">
                      importado
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs text-[var(--color-muted)]">
                    {formatDatePtBR(entry.playedAt ?? entry.endedAt ?? '')}
                  </span>
                  {entry.winner != null && (
                    <span className="text-xs text-[var(--color-primary)]">
                      {entry.winner}
                    </span>
                  )}
                  {entry.winner == null && (
                    <span className="text-xs text-[var(--color-muted)]">Empate</span>
                  )}
                </div>
                {buildScoreLine(entry) && (
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                    {buildScoreLine(entry)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
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
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-4 top-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-4 pt-2">
        <p className="text-sm font-semibold text-[var(--color-text)]">Confirme seu e-mail</p>
        <p className="text-xs leading-relaxed text-[var(--color-muted)]">
          Conta criada! Enviamos um link de confirmação para{' '}
          <span className="font-medium text-[var(--color-text)]">{email}</span>. Clique no link para
          entrar.
        </p>

        {resendError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {resendError}
          </p>
        )}

        <button
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-white/20 hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0
            ? `Reenviado ✓ (aguarde ${cooldown}s)`
            : 'Reenviar e-mail'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AuthPanel — ponto de entrada público
// ---------------------------------------------------------------------------

export function AuthPanel({ onClose, initialTab = 'signin' }: AuthPanelProps) {
  const { user, loading, login, register, logout, resend } = useAuth()

  const [tab, setTab] = useState<Tab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Guarda o email pendente de confirmação; null = sem confirmação pendente
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  function validate(): string | null {
    if (!isValidEmail(email)) return 'Informe um endereço de email válido.'
    if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
    if (tab === 'signup' && displayName.trim().length === 0) return 'Informe seu nome de exibição.'
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

  // Painel de login / cadastro
  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-4 top-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        {(['signin', 'signup'] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={[
              'flex-1 rounded-lg py-1.5 text-sm font-medium transition-all',
              tab === t
                ? 'bg-white/10 text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {t === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        {tab === 'signup' && (
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Nome de exibição</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como você quer ser chamado"
              maxLength={40}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete={tab === 'signin' ? 'username' : 'email'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === 'signin' ? '••••••••' : 'Mínimo 8 caracteres'}
            autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none transition-colors focus:border-[var(--color-primary)]/50 focus:bg-white/8"
          />
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
              ? 'Entrando…'
              : 'Criando conta…'
            : tab === 'signin'
              ? 'Entrar'
              : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
