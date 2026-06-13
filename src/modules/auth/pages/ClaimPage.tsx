/**
 * ClaimPage — /claim?token=<uuid>  ou  /claim?game=<join_token>
 *
 * Dois modos:
 *  A) ?token=<uuid>  → convite por participante (fluxo original, migration 0005)
 *  B) ?game=<uuid>   → convite genérico da sessão (migration 0006): o usuário
 *     loga e escolhe qual participante é.
 *
 * Fluxo comum:
 *  1. Se Supabase não está configurado → mensagem "Indisponível".
 *  2. Se não há nenhum parâmetro válido → mensagem de link inválido.
 *  3. Se não está logado → exibe AuthPanel com explicação.
 *
 * Sem exposição de PII.
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, UserCheck } from 'lucide-react'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { useAuth } from '../hooks/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { readViteEnv } from '../../../shared/services/vite-env'
import {
  listClaimableParticipants,
  claimParticipantByGame,
} from '../services/normalized-history.service'
import type { ClaimableParticipant } from '../services/normalized-history.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHomeUrl(): string {
  const base = readViteEnv('BASE_URL') ?? '/'
  return base
}

// ---------------------------------------------------------------------------
// ClaimPage — dispatcher
// ---------------------------------------------------------------------------

export function ClaimPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const game = searchParams.get('game') ?? ''

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

  if (game) {
    return <SessionClaimPage gameToken={game} />
  }

  if (token) {
    return <ClaimPageInner token={token} />
  }

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

// ---------------------------------------------------------------------------
// AuthGate — shared: bloco de login para usuário não autenticado
// ---------------------------------------------------------------------------

function AuthGate() {
  const [showAuthPanel, setShowAuthPanel] = useState(false)

  return (
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
  )
}

// ---------------------------------------------------------------------------
// SuccessCard — shared: tela de sucesso reutilizável
// ---------------------------------------------------------------------------

function SuccessCard({ gameId }: { gameId: string | null }) {
  return (
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
  )
}

// ---------------------------------------------------------------------------
// SessionClaimPage — modo ?game=<join_token> (migration 0006)
// ---------------------------------------------------------------------------

interface SessionClaimPageProps {
  gameToken: string
}

function SessionClaimPage({ gameToken }: SessionClaimPageProps) {
  const { user, loading } = useAuth()
  const [participants, setParticipants] = useState<ClaimableParticipant[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<{ gameId: string | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!user || loading || fetchedRef.current) return
    fetchedRef.current = true
    setLoadingList(true)
    void listClaimableParticipants(gameToken).then((list) => {
      setParticipants(list)
      setLoadingList(false)
    })
  }, [user, loading, gameToken])

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
        <AuthGate />
      </PageShell>
    )
  }

  if (claimed) {
    return (
      <PageShell>
        <SuccessCard gameId={claimed.gameId} />
      </PageShell>
    )
  }

  async function handleClaim(participantId: string) {
    if (claimingId) return
    setClaimingId(participantId)
    setErrorMsg(null)
    const result = await claimParticipantByGame(gameToken, participantId)
    setClaimingId(null)
    if (result.error) {
      setErrorMsg(result.error)
      if (result.error.includes('já reivindicou')) {
        // Atualiza lista para refletir estado
        void listClaimableParticipants(gameToken).then(setParticipants)
      }
    } else {
      setClaimed({ gameId: result.gameId })
    }
  }

  if (loadingList) {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">Carregando participantes…</p>
        </StatusCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            Qual é o seu nome na partida?
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Selecione o participante que é você.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden="true" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {participants.length === 0 ? (
          <p className="text-center text-xs text-[var(--color-muted)]">
            Nenhum participante encontrado para este link.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {participants.map((p) => (
              <li
                key={p.participantId}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--color-text)]">
                    {p.displayName}
                  </p>
                  {p.teamName && (
                    <p className="text-[10px] text-[var(--color-muted)]">{p.teamName}</p>
                  )}
                </div>
                {p.claimed ? (
                  <span
                    aria-label={`${p.displayName} já vinculado`}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-1 text-[9px] font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  >
                    <UserCheck className="h-2.5 w-2.5" aria-hidden="true" />
                    já vinculado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleClaim(p.participantId)}
                    disabled={claimingId !== null}
                    aria-label={`Sou ${p.displayName}`}
                    className="shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-[11px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {claimingId === p.participantId ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      'Sou eu'
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// ClaimPageInner — modo ?token=<uuid> (fluxo original, migration 0005)
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
        <SuccessCard gameId={gameId} />
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
