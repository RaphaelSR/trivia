/**
 * ClaimPage — /claim?token=, /claim?game= ou /claim?session=
 *
 * Tres modos:
 *  A) ?token=<uuid>  → convite por participante (fluxo original, migration 0005)
 *  B) ?game=<uuid>   → convite genérico da sessão (migration 0006): o usuário
 *     loga e escolhe qual participante é.
 *  C) ?session=<uuid> → convite permanente ao vivo (migration 0009), valido
 *     durante o jogo e no historico normalizado depois do fim.
 *
 * Fluxo comum:
 *  1. Se Supabase não está configurado → mensagem "Indisponível".
 *  2. Se não há nenhum parâmetro válido → mensagem de link inválido.
 *  3. Se não está logado → exibe AuthPanel com explicação.
 *
 * Sem exposição de PII.
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { useAuth } from '../hooks/useAuth'
import { AuthPanel } from '../components/AuthPanel'
import { readViteEnv } from '../../../shared/services/vite-env'
import {
  listClaimableParticipants,
  claimParticipantByGame,
} from '../services/normalized-history.service'
import type { ClaimableParticipant } from '../services/normalized-history.service'
import {
  claimLiveSessionParticipant,
  listLiveSessionParticipants,
  type LiveSessionParticipant,
} from '../services/live-session-claim.service'
import { ProfileAvatarEditor } from '../components/ProfileAvatarEditor'
import { useTranslation } from '@/shared/i18n'
import { useThemeMode } from '@/app/providers/useThemeMode'
import { Button } from '@/components/ui/Button'
import type { User } from '@supabase/supabase-js'

type ClaimedParticipantSummary = {
  displayName: string
  teamName: string | null
}

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
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const game = searchParams.get('game') ?? ''
  const session = searchParams.get('session') ?? ''

  if (!isSupabaseConfigured()) {
    return (
      <PageShell>
        <StatusCard icon="unavailable">
          <p className="text-sm font-semibold text-[var(--color-text)]">{t('claim.unavailable')}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t('claim.unavailableDescription')}
          </p>
        </StatusCard>
      </PageShell>
    )
  }

  if (session) {
    return <LiveSessionClaimPage joinToken={session} />
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
        <p className="text-sm font-semibold text-[var(--color-text)]">{t('claim.invalidLink')}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {t('claim.invalidLinkDescription')}
        </p>
      </StatusCard>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// LiveSessionClaimPage — modo ?session=<join_token> (migration 0009)
// ---------------------------------------------------------------------------

function LiveSessionClaimPage({ joinToken }: { joinToken: string }) {
  const { t } = useTranslation('auth')
  const { user, loading } = useAuth()
  const [participants, setParticipants] = useState<LiveSessionParticipant[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<{
    gameId: string | null
    participant: ClaimedParticipantSummary
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const refreshParticipants = useCallback(async () => {
    setLoadingList(true)
    try {
      const result = await listLiveSessionParticipants(joinToken)
      setParticipants(result.participants)
      setErrorMsg(result.error)
    } catch {
      setErrorMsg(t('services.liveClaim.refreshFailed'))
    } finally {
      setLoadingList(false)
    }
  }, [joinToken, t])

  useEffect(() => {
    if (!user || loading || fetchedRef.current) return
    fetchedRef.current = true
    void refreshParticipants()
  }, [user, loading, refreshParticipants])

  if (loading) {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">{t('claim.checkingSession')}</p>
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
        <SuccessCard user={user} gameId={claimed.gameId} participant={claimed.participant} />
      </PageShell>
    )
  }

  const claimedByMe = participants.find((participant) => participant.claimedByMe)
  if (claimedByMe) {
    return (
      <PageShell>
        <SuccessCard
          user={user}
          gameId={null}
          participant={{
            displayName: claimedByMe.displayName,
            teamName: claimedByMe.teamName,
          }}
          alreadyLinked
        />
      </PageShell>
    )
  }

  async function handleClaim(participantClientId: string) {
    if (claimingId) return
    setClaimingId(participantClientId)
    setErrorMsg(null)
    const participant = participants.find((item) => item.participantClientId === participantClientId)
    try {
      const result = await claimLiveSessionParticipant(joinToken, participantClientId)
      if (result.error) {
        setErrorMsg(result.error)
        await refreshParticipants()
        return
      }
      setClaimed({
        gameId: result.gameId,
        participant: {
          displayName: participant?.displayName ?? t('claim.playerFallback'),
          teamName: participant?.teamName ?? null,
        },
      })
    } catch {
      setErrorMsg(t('services.liveClaim.claimFailedRetry'))
    } finally {
      setClaimingId(null)
    }
  }

  if (loadingList) {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">{t('claim.loadingParticipants')}</p>
        </StatusCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_24px_80px_color-mix(in_srgb,var(--color-shadow)_14%,transparent)] sm:p-7">
        <div className="text-center">
          <p className="text-xl font-semibold tracking-tight text-[var(--color-text)]">{t('claim.liveQuestion')}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">
            {t('claim.liveDescription')}
          </p>
        </div>

        {errorMsg ? (
          <div role="status" className="flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            <p className="text-sm leading-5 text-red-500">{errorMsg}</p>
          </div>
        ) : null}

        {participants.length === 0 ? (
          <p className="text-center text-xs text-[var(--color-muted)]">
            {t('claim.noAvailableParticipant')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5" role="list">
            {participants.map((participant) => (
              <li
                key={participant.participantClientId}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {participant.displayName}
                  </p>
                  {participant.teamName ? (
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{participant.teamName}</p>
                  ) : null}
                </div>
                {participant.claimed ? (
                  <span className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {participant.claimedByMe ? t('claim.you') : t('claim.linked')}
                  </span>
                ) : participant.claimable ? (
                  <Button
                    type="button"
                    onClick={() => void handleClaim(participant.participantClientId)}
                    disabled={claimingId !== null}
                    aria-label={t('claim.iAmName', { name: participant.displayName })}
                    size="sm"
                    className="min-h-11 shrink-0 px-4"
                  >
                    {claimingId === participant.participantClientId ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {t('claim.confirming')}
                      </>
                    ) : (
                      t('claim.iAm')
                    )}
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">{t('claim.reserved')}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="ghost"
          disabled={loadingList || claimingId !== null}
          onClick={() => void refreshParticipants()}
          className="h-11 w-full"
        >
          <RefreshCw className="h-4 w-4" />
          {t('claim.refreshParticipants')}
        </Button>
      </div>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// AuthGate — shared: bloco de login para usuário não autenticado
// ---------------------------------------------------------------------------

function AuthGate() {
  const { t } = useTranslation('auth')
  const [showAuthPanel, setShowAuthPanel] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      {!showAuthPanel ? (
        <div className="w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_color-mix(in_srgb,var(--color-shadow)_14%,transparent)] sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
            <UserCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xl font-semibold tracking-tight text-[var(--color-text)]">
            {t('claim.authTitle')}
          </p>
          <p className="mb-6 text-sm leading-6 text-[var(--color-muted)]">
            {t('claim.authDescription')}
          </p>
          <Button
            type="button"
            onClick={() => setShowAuthPanel(true)}
            className="h-12 w-full"
          >
            {t('claim.authAction')}
          </Button>
          <div className="mt-5 flex items-start gap-2 border-t border-[var(--color-border)] pt-4 text-xs leading-5 text-[var(--color-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            <span>{t('claim.authPrivacy')}</span>
          </div>
        </div>
      ) : null}

      {showAuthPanel && (
        <AuthPanel
          onClose={() => setShowAuthPanel(false)}
          initialTab="signin"
          context="claim"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SuccessCard — shared: tela de sucesso reutilizável
// ---------------------------------------------------------------------------

function SuccessCard({
  user,
  gameId,
  participant,
  alreadyLinked = false,
}: {
  user: User
  gameId: string | null
  participant?: ClaimedParticipantSummary
  alreadyLinked?: boolean
}) {
  const { t } = useTranslation('auth')
  const [showAvatarSetup, setShowAvatarSetup] = useState(true)
  const profileName =
    (user?.user_metadata as Record<string, string> | undefined)?.display_name ??
    user?.email?.split('@')[0] ??
    t('claim.playerFallback')

  return (
    <StatusCard icon="success">
      <p className="text-sm font-semibold text-[var(--color-text)]">
        {alreadyLinked ? t('claim.alreadyYoursTitle') : t('claim.successTitle')}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {alreadyLinked ? t('claim.alreadyYoursDescription') : t('claim.successDescription')}
      </p>
      {participant ? (
        <div className="mt-3 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {t('claim.yourParticipation')}
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--color-text)]">{participant.displayName}</p>
          {participant.teamName ? (
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">{participant.teamName}</p>
          ) : null}
        </div>
      ) : null}
      {gameId && (
        <p className="mt-1 text-[10px] text-[var(--color-muted)]">
          {t('claim.gameId', { id: gameId })}
        </p>
      )}
      {showAvatarSetup ? (
        <div className="mt-4 w-full">
          <ProfileAvatarEditor name={profileName} variant="claim" />
          <button
            type="button"
            onClick={() => setShowAvatarSetup(false)}
            className="mt-2 min-h-11 rounded-xl px-3 text-xs font-medium text-[var(--color-muted)] underline-offset-2 hover:bg-[var(--color-background)] hover:underline"
          >
            {t('claim.notNow')}
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAvatarSetup(true)}
          className="mt-4 h-11 w-full"
        >
          {t('claim.managePhoto')}
        </Button>
      )}
      <Link
        to={getHomeUrl()}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-[var(--color-surface)] transition-opacity hover:opacity-90"
      >
        {t('claim.dashboard')}
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
  const { t } = useTranslation('auth')
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
          <p className="text-sm text-[var(--color-muted)]">{t('claim.checkingSession')}</p>
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
        <SuccessCard user={user} gameId={claimed.gameId} />
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
      // Sempre atualiza a lista: não acopla o comportamento ao idioma do erro.
      void listClaimableParticipants(gameToken).then(setParticipants)
    } else {
      setClaimed({ gameId: result.gameId })
    }
  }

  if (loadingList) {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">{t('claim.loadingParticipants')}</p>
        </StatusCard>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_24px_80px_color-mix(in_srgb,var(--color-shadow)_14%,transparent)] sm:p-7">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {t('claim.historicalQuestion')}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {t('claim.historicalDescription')}
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
            {t('claim.noParticipant')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {participants.map((p) => (
              <li
                key={p.participantId}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3"
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
                    aria-label={t('claim.alreadyLinkedAria', { name: p.displayName })}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-1 text-[9px] font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  >
                    <UserCheck className="h-2.5 w-2.5" aria-hidden="true" />
                    {t('claim.alreadyLinked')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleClaim(p.participantId)}
                    disabled={claimingId !== null}
                    aria-label={t('claim.iAmName', { name: p.displayName })}
                    className="min-h-11 shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-surface)] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {claimingId === p.participantId ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      t('claim.iAm')
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
  const { t } = useTranslation('auth')
  const { user, loading, claim } = useAuth()
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
          <p className="text-sm text-[var(--color-muted)]">{t('claim.checkingSession')}</p>
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

  if (status === 'idle' || status === 'loading') {
    return (
      <PageShell>
        <StatusCard icon="loading">
          <p className="text-sm text-[var(--color-muted)]">{t('claim.linking')}</p>
        </StatusCard>
      </PageShell>
    )
  }

  if (status === 'success') {
    return (
      <PageShell>
        <SuccessCard user={user} gameId={gameId} />
      </PageShell>
    )
  }

  // status === 'error'
  return (
    <PageShell>
      <StatusCard icon="error">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {t('claim.failureTitle')}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {errorMsg ?? t('claim.failureFallback')}
        </p>
        <Link
          to={getHomeUrl()}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          {t('claim.backHome')}
        </Link>
      </StatusCard>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('auth')
  const { theme, setTheme } = useThemeMode()
  const dark = theme === 'dark'

  useEffect(() => {
    if (theme !== 'light' && theme !== 'dark') setTheme('light')
  }, [setTheme, theme])

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-text)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link to={getHomeUrl()} className="inline-flex min-h-11 items-center gap-3 rounded-xl pr-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-surface)] shadow-sm">
            <Film className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-4">{t('claim.brand')}</span>
            <span className="block text-[10px] leading-4 text-[var(--color-muted)]">{t('claim.brandSubtitle')}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? t('claim.useLightTheme') : t('claim.useDarkTheme')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] shadow-sm transition-colors hover:text-[var(--color-text)]"
        >
          {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl items-start justify-center px-4 pb-10 pt-4 sm:min-h-[calc(100dvh-96px)] sm:items-center sm:px-6 sm:pb-16 sm:pt-0">
        {children}
      </main>
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
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[0_24px_80px_color-mix(in_srgb,var(--color-shadow)_14%,transparent)] sm:p-8">
      {icon === 'loading' && (
        <Loader2 className="h-9 w-9 animate-spin text-[var(--color-primary)]" />
      )}
      {icon === 'success' && (
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      )}
      {(icon === 'error' || icon === 'unavailable') && (
        <AlertCircle className="h-9 w-9 text-red-500" />
      )}
      <div className="flex w-full flex-col items-center gap-1">{children}</div>
    </div>
  )
}
