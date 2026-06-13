/**
 * ClaimPage — /claim?token=<uuid>
 *
 * Permite que um usuário reivindique uma participação em uma partida por link.
 *
 * Fluxo:
 *  1. Se Supabase não está configurado → mensagem "Indisponível".
 *  2. Se não há token na URL → mensagem de link inválido.
 *  3. Se não está logado → exibe AuthPanel com explicação.
 *  4. Se está logado → chama claim(token) automaticamente (uma vez) e exibe
 *     resultado: sucesso ou erro.
 *
 * Sem exposição de PII.
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { useAuth } from '../hooks/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { readViteEnv } from '../../../shared/services/vite-env'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHomeUrl(): string {
  const base = readViteEnv('BASE_URL') ?? '/'
  return base
}

// ---------------------------------------------------------------------------
// ClaimPage
// ---------------------------------------------------------------------------

export function ClaimPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  if (!isSupabaseConfigured()) {
    return (
      <PageShell>
        <StatusCard icon="unavailable">
          <p className="text-sm font-semibold text-[var(--color-text)]">Indisponível</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Esta funcionalidade não está disponível neste ambiente.
          </p>
        </StatusCard>
      </PageShell>
    )
  }

  if (!token) {
    return (
      <PageShell>
        <StatusCard icon="error">
          <p className="text-sm font-semibold text-[var(--color-text)]">Link inválido</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            O link não contém um token válido. Verifique o link e tente novamente.
          </p>
        </StatusCard>
      </PageShell>
    )
  }

  return <ClaimPageInner token={token} />
}

// ---------------------------------------------------------------------------
// ClaimPageInner — lógica após validação básica
// ---------------------------------------------------------------------------

interface ClaimPageInnerProps {
  token: string
}

function ClaimPageInner({ token }: ClaimPageInnerProps) {
  const { user, loading, claim } = useAuth()
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [gameId, setGameId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const claimedRef = useRef(false)

  useEffect(() => {
    if (!user || claimedRef.current || loading) return
    claimedRef.current = true
    setStatus('loading')

    void claim(token).then((result) => {
      if (result.error) {
        setStatus('error')
        setErrorMsg(result.error)
      } else {
        setStatus('success')
        setGameId(result.gameId)
      }
    })
  }, [user, loading, claim, token])

  if (loading) {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">Verificando sessão…</p>
        </StatusCard>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-5 shadow-2xl backdrop-blur-xl">
            <p className="mb-1 text-sm font-semibold text-[var(--color-text)]">
              Entre para reivindicar sua participação
            </p>
            <p className="mb-4 text-xs text-[var(--color-muted)]">
              Crie uma conta ou entre para vincular esta partida ao seu perfil.
            </p>
            <button
              onClick={() => setShowAuthPanel(true)}
              className="w-full rounded-lg bg-[var(--color-primary)] py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Entrar / Criar conta
            </button>
          </div>

          {showAuthPanel && (
            <AuthPanel
              onClose={() => setShowAuthPanel(false)}
              initialTab="signin"
            />
          )}
        </div>
      </PageShell>
    )
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">Vinculando participação…</p>
        </StatusCard>
      </PageShell>
    )
  }

  if (status === 'success') {
    return (
      <PageShell>
        <StatusCard icon="success">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Partida vinculada à sua conta!
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            A sua participação foi registrada com sucesso.
          </p>
          {gameId && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              ID da partida: <span className="font-mono text-[var(--color-text)]">{gameId}</span>
            </p>
          )}
          <Link
            to={getHomeUrl()}
            className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Ver meu painel
          </Link>
        </StatusCard>
      </PageShell>
    )
  }

  // status === 'error'
  return (
    <PageShell>
      <StatusCard icon="error">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          Não foi possível vincular
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {errorMsg ?? 'Link inválido ou já utilizado.'}
        </p>
        <Link
          to={getHomeUrl()}
          className="mt-4 inline-block rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          Voltar para o início
        </Link>
      </StatusCard>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
      {children}
    </div>
  )
}

type IconType = 'loading' | 'success' | 'error' | 'unavailable'

function StatusCard({
  icon,
  children,
}: {
  icon: IconType
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl text-center">
      {icon === 'loading' && (
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      )}
      {icon === 'success' && (
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      )}
      {(icon === 'error' || icon === 'unavailable') && (
        <AlertCircle className="h-8 w-8 text-red-400" />
      )}
      <div className="flex flex-col items-center gap-1">{children}</div>
    </div>
  )
}
