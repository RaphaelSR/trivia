/**
 * GameDetailView — tela de detalhe de partida (read-only), modo online.
 *
 * Exibe:
 *  - Cabeçalho: título, data, duração, badge "importado", vencedor
 *  - Placar dos times (ordenado por final_score desc)
 *  - Ranking de participantes (trivia pts, mimica pts, total, badge "vinculado")
 *  - Board de filmes e perguntas (quem acertou quando answered)
 *  - Timeline compacta dos eventos
 *
 * Gateado por isSupabaseConfigured() e login (getGameDetail cuida disso).
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Trophy, Clock, Upload, UserCheck, Link2, CopyPlus, Loader2 } from 'lucide-react'
import {
  getGameDetail,
  getNormalizedGameSnapshot,
  buildSessionClaimUrl,
} from '../services/normalized-history.service'
import type { GameDetail, TimelineEntry } from '../services/normalized-history.service'
import { InviteShare } from './InviteShare'
import { ShareChannels } from './ShareChannels'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import {
  listGameParticipantIdentities,
  type ParticipantIdentity,
} from '../services/profile-avatar.service'
import { useTranslation } from '@/shared/i18n'
import { Button } from '@/components/ui/Button'
import { FinishedGameCopyModal } from '@/components/ui/FinishedGameCopyModal'
import {
  createFinishedGameCopy,
  type FinishedGameCopyMode,
} from '@/modules/game/domain/historical-game-copy'
import type { TriviaSession } from '@/modules/trivia/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameDetailViewProps {
  gameId: string
  onBack: () => void
  onOpenCopy?: (session: TriviaSession) => boolean | Promise<boolean>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—'
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

function getDurationParts(startedAt: string | null, endedAt: string | null): { hours: number; minutes: number; seconds: number } | null {
  if (!startedAt || !endedAt) return null
  try {
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
    if (ms <= 0) return null
    const totalSec = Math.round(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return { hours: h, minutes: m, seconds: s }
  } catch {
    return null
  }
}

function formatTimeShort(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// GameDetailView
// ---------------------------------------------------------------------------

export function GameDetailView({ gameId, onBack, onOpenCopy }: GameDetailViewProps) {
  const { t, i18n } = useTranslation(['auth', 'common', 'game'])
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [identities, setIdentities] = useState<Record<string, ParticipantIdentity>>({})
  const [copySource, setCopySource] = useState<TriviaSession | null>(null)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyOpening, setCopyOpening] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    Promise.all([getGameDetail(gameId), listGameParticipantIdentities(gameId)])
      .then(([result, identityRows]) => {
        if (!cancelled) {
          setIdentities(Object.fromEntries(identityRows.map((identity) => [identity.participantClientId, identity])))
          if (result === null) {
            setError(true)
          } else {
            setDetail(result)
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [gameId])

  async function handlePrepareCopy() {
    if (!onOpenCopy || copyLoading) return
    setCopyLoading(true)
    setCopyError(null)
    const snapshot = await getNormalizedGameSnapshot(gameId)
    setCopyLoading(false)
    if (!snapshot) {
      setCopyError(t('finishedCopy.loadError', { ns: 'game' }))
      return
    }
    setCopySource(snapshot)
  }

  async function handleOpenCopy(mode: FinishedGameCopyMode) {
    if (!copySource || !onOpenCopy || copyOpening) return
    setCopyOpening(true)
    setCopyError(null)
    const copy = createFinishedGameCopy(copySource, mode, {
      title: t('finishedCopy.copySuffix', { ns: 'game', title: copySource.title }),
    })
    try {
      const opened = await onOpenCopy(copy)
      if (!opened) {
        setCopyError(t('finishedCopy.saveError', { ns: 'game' }))
        setCopyOpening(false)
        return
      }
      setCopySource(null)
    } catch {
      setCopyError(t('finishedCopy.saveError', { ns: 'game' }))
      setCopyOpening(false)
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          onClick={onBack}
          aria-label={t('actions.back', { ns: 'common' })}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--color-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
          {loading ? t('gameDetail.loading', { ns: 'auth' }) : error ? t('gameDetail.fallbackTitle', { ns: 'auth' }) : (detail?.title ?? t('gameDetail.gameFallback', { ns: 'auth' }))}
        </p>
      </div>

      {/* Content */}
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto p-4 sm:max-h-[70vh]">
        {loading && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            {t('gameDetail.loadingDetails', { ns: 'auth' })}
          </p>
        )}

        {!loading && error && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            {t('gameDetail.loadError', { ns: 'auth' })}
          </p>
        )}

        {!loading && !error && detail && (
          <>
            {/* ── Cabeçalho ───────────────────────────────────────────── */}
            <section aria-label={t('gameDetail.information', { ns: 'auth' })}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-[var(--color-muted)]">
                  {formatDate(detail.played_at ?? detail.ended_at, i18n.resolvedLanguage ?? i18n.language)}
                </span>
                {getDurationParts(detail.started_at, detail.ended_at) && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      const duration = getDurationParts(detail.started_at, detail.ended_at)!
                      if (duration.hours > 0) return t('gameDetail.durationHours', { ns: 'auth', hours: duration.hours, minutes: duration.minutes })
                      if (duration.minutes > 0) return t('gameDetail.durationMinutes', { ns: 'auth', minutes: duration.minutes, seconds: duration.seconds })
                      return t('gameDetail.durationSeconds', { ns: 'auth', seconds: duration.seconds })
                    })()}
                  </span>
                )}
                {detail.source === 'import' && (
                  <span
                    aria-label={t('gameDetail.importedGame', { ns: 'auth' })}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-[var(--color-muted)]"
                  >
                    <Upload className="h-2.5 w-2.5" />
                    {t('gameDetail.imported', { ns: 'auth' })}
                  </span>
                )}
              </div>
              {detail.winner_team_name && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-primary)]">
                  <Trophy className="h-3 w-3" />
                  {t('gameDetail.winner', { ns: 'auth', name: detail.winner_team_name })}
                </div>
              )}
              {!detail.winner_team_name && detail.teams.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t('gameDetail.tie', { ns: 'auth' })}</p>
              )}
              {onOpenCopy ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={copyLoading}
                    onClick={() => void handlePrepareCopy()}
                    className="h-11 w-full"
                  >
                    {copyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
                    {copyLoading
                      ? t('gameDetail.preparingCopy', { ns: 'auth' })
                      : t('gameDetail.openCopy', { ns: 'auth' })}
                  </Button>
                  <p className="mt-2 text-[10px] leading-4 text-[var(--color-muted)]">
                    {t('gameDetail.openCopyDescription', { ns: 'auth' })}
                  </p>
                  {copyError && !copySource ? (
                    <p role="status" className="mt-2 text-xs text-red-400">{copyError}</p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* ── Placar dos times ─────────────────────────────────────── */}
            {detail.teams.length > 0 && (
              <section aria-label={t('gameDetail.scoreboardLabel', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.scoreboard', { ns: 'auth' })}</SectionTitle>
                <ul className="flex flex-col gap-1.5" role="list">
                  {[...detail.teams]
                    .sort((a, b) => b.final_score - a.final_score)
                    .map((team) => (
                      <li
                        key={team.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {team.color && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: team.color }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate text-xs text-[var(--color-text)]">
                            {team.name}
                          </span>
                          {detail.winner_team_id === team.id && (
                            <Trophy className="h-3 w-3 shrink-0 text-[var(--color-primary)]" aria-label={t('gameDetail.winnerLabel', { ns: 'auth' })} />
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-[var(--color-text)]">
                          {team.final_score}
                        </span>
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {/* ── Ranking de participantes ─────────────────────────────── */}
            {detail.ranking.length > 0 && (
              <section aria-label={t('gameDetail.rankingLabel', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.ranking', { ns: 'auth' })}</SectionTitle>
                <ul className="flex flex-col gap-1.5" role="list">
                  {detail.ranking.map((stat, idx) => (
                    <li
                      key={stat.participant_id}
                      className="rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-center text-[10px] text-[var(--color-muted)]">
                          {idx + 1}
                        </span>
                        <ParticipantAvatar
                          name={stat.display_name}
                          src={stat.participant_client_id ? identities[stat.participant_client_id]?.avatarUrl : null}
                          size={28}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text)]">
                          {stat.display_name}
                        </span>
                        {stat.profile_id && (
                          <span
                            aria-label={t('gameDetail.linkedParticipant', { ns: 'auth' })}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          >
                            <UserCheck className="h-2.5 w-2.5" aria-hidden="true" />
                            {t('gameDetail.linked', { ns: 'auth' })}
                          </span>
                        )}
                        <span className="shrink-0 text-xs font-semibold text-[var(--color-text)]">
                          {t('gameDetail.pointsShort', { ns: 'auth', points: stat.total_points })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-6">
                        {stat.team_name && (
                          <span className="text-[10px] text-[var(--color-muted)]">
                            {stat.team_name}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--color-muted)]">
                          {t('gameDetail.triviaPoints', { ns: 'auth', points: stat.trivia_points })}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted)]">
                          {t('gameDetail.mimicaPoints', { ns: 'auth', points: stat.mimica_points })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Convite genérico da sessão (só para o dono) ─────────── */}
            {detail.isOwner && detail.joinToken && (
              <section aria-label={t('gameDetail.inviteLabel', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.inviteTitle', { ns: 'auth' })}</SectionTitle>
                <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs font-medium text-[var(--color-text)]">
                      {t('gameDetail.oneLink', { ns: 'auth' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    {t('gameDetail.inviteDescription', { ns: 'auth' })}
                  </p>
                  <ShareChannels
                    url={buildSessionClaimUrl(detail.joinToken)}
                    label={t('gameDetail.sessionShareLabel', { ns: 'auth' })}
                  />
                </div>
              </section>
            )}

            {/* ── Convites por participante ────────────────────────────── */}
            {detail.participants.some((p) => p.profile_id === null && p.claim_token !== null) && (
              <section aria-label={t('gameDetail.participantInviteLabel', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.participantInviteTitle', { ns: 'auth' })}</SectionTitle>
                <ul className="flex flex-col gap-2" role="list">
                  {detail.participants.map((p) => (
                    <li key={p.id}>
                      <InviteShare participant={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Board: filmes e perguntas ────────────────────────────── */}
            {detail.films.length > 0 && (
              <section aria-label={t('gameDetail.questionsByFilm', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.questions', { ns: 'auth' })}</SectionTitle>
                <div className="flex flex-col gap-3">
                  {[...detail.films]
                    .sort((a, b) => a.order - b.order)
                    .map((film) => {
                      const filmQuestions = detail.questions.filter(
                        (q) => q.film_id === film.id,
                      )
                      if (filmQuestions.length === 0) return null
                      return (
                        <div key={film.id}>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            {film.name}
                          </p>
                          <ul className="flex flex-col gap-1" role="list">
                            {filmQuestions.map((q) => {
                              // find who answered
                              const answerEvent = detail.timeline.find(
                                (e) => e.question_id === q.id && !e.voided,
                              )
                              const answererName = answerEvent?.actor_name ?? null
                              return (
                                <li
                                  key={q.id}
                                  className={[
                                    'rounded-lg border px-2.5 py-1.5',
                                    q.state === 'answered'
                                      ? 'border-white/10 bg-white/5'
                                      : 'border-white/5 bg-white/3',
                                  ].join(' ')}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-[11px] text-[var(--color-text)]">
                                      {q.question ?? '—'}
                                    </p>
                                    <span
                                      className={[
                                        'shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold',
                                        q.state === 'answered'
                                          ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                                          : 'bg-white/5 text-[var(--color-muted)]',
                                      ].join(' ')}
                                    >
                                      {t('gameDetail.pointsShort', { ns: 'auth', points: q.points })}
                                    </span>
                                  </div>
                                  {q.answer && (
                                    <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                                      {t('gameDetail.answerPrefix', { ns: 'auth', answer: q.answer })}
                                    </p>
                                  )}
                                  {answererName && (
                                    <p className="mt-0.5 text-[10px] text-[var(--color-primary)]">
                                      {t('gameDetail.answeredBy', { ns: 'auth', name: answererName })}
                                    </p>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )
                    })}
                </div>
              </section>
            )}

            {/* ── Timeline ─────────────────────────────────────────────── */}
            {detail.timeline.length > 0 && (
              <section aria-label={t('gameDetail.timelineLabel', { ns: 'auth' })}>
                <SectionTitle>{t('gameDetail.timeline', { ns: 'auth' })}</SectionTitle>
                <div className="overflow-x-auto">
                  <ul className="flex min-w-0 flex-col gap-1" role="list">
                    {detail.timeline.map((entry) => (
                      <TimelineRow key={entry.event_id} entry={entry} />
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {copySource ? (
        <FinishedGameCopyModal
          isOpen
          sourceTitle={copySource.title}
          busy={copyOpening}
          error={copyError}
          onClose={() => {
            if (copyOpening) return
            setCopySource(null)
            setCopyError(null)
          }}
          onChoose={(mode) => void handleOpenCopy(mode)}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </p>
  )
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const { t, i18n } = useTranslation('auth')
  const label = entry.type === 'trivia' ? t('gameDetail.trivia') : t('gameDetail.mimica')
  const pts = entry.voided ? t('gameDetail.voided') : `+${t('gameDetail.pointsShort', { points: entry.points })}`
  return (
    <li
      className={[
        'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[10px]',
        entry.voided ? 'opacity-50' : '',
        'border border-white/5 bg-white/5',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="shrink-0 text-[var(--color-muted)]">{formatTimeShort(entry.occurred_at, i18n.resolvedLanguage ?? i18n.language)}</span>
      <span
        className={[
          'shrink-0 rounded px-1 py-0.5 font-medium',
          entry.type === 'trivia'
            ? 'bg-blue-500/15 text-blue-400'
            : 'bg-purple-500/15 text-purple-400',
        ].join(' ')}
      >
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[var(--color-text)]">
        {entry.actor_name ?? (entry.team_name ?? '—')}
        {entry.question_text && (
          <span className="text-[var(--color-muted)]"> · {entry.question_text}</span>
        )}
      </span>
      <span
        className={[
          'shrink-0 font-semibold',
          entry.voided ? 'text-[var(--color-muted)]' : 'text-[var(--color-primary)]',
        ].join(' ')}
      >
        {pts}
      </span>
    </li>
  )
}
