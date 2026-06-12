import { useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

type Tab = 'signin' | 'signup'

interface AuthPanelProps {
  onClose: () => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const { user, loading, login, register, logout } = useAuth()

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function validate(): string | null {
    if (!isValidEmail(email)) return 'Informe um endereço de email válido.'
    if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
    if (tab === 'signup' && displayName.trim().length === 0) return 'Informe seu nome de exibição.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (tab === 'signin') {
      const err = await login(email, password)
      if (err) setError(err)
    } else {
      const err = await register(email, password, displayName.trim())
      if (err) {
        setError(err)
      } else {
        setSuccessMsg('Conta criada! Verifique seu email para confirmar o cadastro.')
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
    setSuccessMsg(null)
  }

  // Painel quando o usuário já está logado
  if (user) {
    const name =
      (user.user_metadata as Record<string, string> | undefined)?.display_name ??
      user.email?.split('@')[0] ??
      'Usuário'

    return (
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
        <button
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-lg font-semibold text-[var(--color-primary)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm font-medium text-[var(--color-text)]">{name}</p>
          <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-white/20 hover:text-[var(--color-text)] disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loading ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </div>
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

        {successMsg && (
          <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
            {successMsg}
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
