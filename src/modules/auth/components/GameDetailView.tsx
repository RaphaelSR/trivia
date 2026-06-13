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
import { ArrowLeft, Trophy, Clock, Upload, UserCheck, Link2 } from 'lucide-react'
import { getGameDetail, buildSessionClaimUrl } from '../services/normalized-history.service'
import type { GameDetail, TimelineEntry } from '../services/normalized-history.service'
import { InviteShare } from './InviteShare'
import { ShareChannels } from './ShareChannels'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameDetailViewProps {
  gameId: string
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatePtBR(iso: string | null): string {
  if (!iso) return '—'
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

function formatDuration(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt || !endedAt) return null
  try {
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
    if (ms <= 0) return null
    const totalSec = Math.round(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  } catch {
    return null
  }
}

function formatTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// GameDetailView
// ---------------------------------------------------------------------------

export function GameDetailView({ gameId, onBack }: GameDetailViewProps) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    getGameDetail(gameId)
      .then((result) => {
        if (!cancelled) {
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

  return (
    <div className="flex w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="shrink-0 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
          {loading ? 'Carregando…' : error ? 'Detalhes da partida' : (detail?.title ?? 'Partida')}
        </p>
      </div>

      {/* Content */}
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
        {loading && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            Carregando detalhes…
          </p>
        )}

        {!loading && error && (
          <p className="text-xs text-[var(--color-muted)]" aria-live="polite">
            Não foi possível carregar os detalhes desta partida.
          </p>
        )}

        {!loading && !error && detail && (
          <>
            {/* ── Cabeçalho ───────────────────────────────────────────── */}
            <section aria-label="Informações da partida">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-[var(--color-muted)]">
                  {formatDatePtBR(detail.played_at ?? detail.ended_at)}
                </span>
                {formatDuration(detail.started_at, detail.ended_at) && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                    <Clock className="h-3 w-3" />
                    {formatDuration(detail.started_at, detail.ended_at)}
                  </span>
                )}
                {detail.source === 'import' && (
                  <span
                    aria-label="Partida importada"
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-[var(--color-muted)]"
                  >
                    <Upload className="h-2.5 w-2.5" />
                    importado
                  </span>
                )}
              </div>
              {detail.winner_team_name && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-primary)]">
                  <Trophy className="h-3 w-3" />
                  Vencedor: {detail.winner_team_name}
                </div>
              )}
              {!detail.winner_team_name && detail.teams.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">Empate</p>
              )}
            </section>

            {/* ── Placar dos times ─────────────────────────────────────── */}
            {detail.teams.length > 0 && (
              <section aria-label="Placar dos times">
                <SectionTitle>Placar</SectionTitle>
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
                            <Trophy className="h-3 w-3 shrink-0 text-[var(--color-primary)]" aria-label="Vencedor" />
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
              <section aria-label="Ranking de participantes">
                <SectionTitle>Ranking</SectionTitle>
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
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-text)]">
                          {stat.display_name}
                        </span>
                        {stat.profile_id && (
                          <span
                            aria-label="Participante vinculado"
                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                          >
                            <UserCheck className="h-2.5 w-2.5" />
                            vinculado
                          </span>
                        )}
                        <span className="shrink-0 text-xs font-semibold text-[var(--color-text)]">
                          {stat.total_points} pts
                        </span>
                      </div>
                      <div className="mt-0.5 flex gap-3 pl-6">
                        {stat.team_name && (
                          <span className="text-[10px] text-[var(--color-muted)]">
                            {stat.team_name}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--color-muted)]">
                          trivia {stat.trivia_points}
                        </span>
                        <span className="text-[10px] text-[var(--color-muted)]">
                          mímica {stat.mimica_points}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Convite genérico da sessão (só para o dono) ─────────── */}
            {detail.isOwner && detail.joinToken && (
              <section aria-label="Convite da sessão">
                <SectionTitle>Convite da sessão</SectionTitle>
                <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs font-medium text-[var(--color-text)]">
                      Link único para todos
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    Compartilhe um único link com todos — cada um escolhe seu nome.
                  </p>
                  <ShareChannels
                    url={buildSessionClaimUrl(detail.joinToken)}
                    label="da sessão"
                  />
                </div>
              </section>
            )}

            {/* ── Convites por participante ────────────────────────────── */}
            {detail.participants.some((p) => p.profile_id === null && p.claim_token !== null) && (
              <section aria-label="Links de convite por participante">
                <SectionTitle>Convidar participantes</SectionTitle>
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
              <section aria-label="Perguntas por filme">
                <SectionTitle>Perguntas</SectionTitle>
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
                                      {q.points} pts
                                    </span>
                                  </div>
                                  {q.answer && (
                                    <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                                      R: {q.answer}
                                    </p>
                                  )}
                                  {answererName && (
                                    <p className="mt-0.5 text-[10px] text-[var(--color-primary)]">
                                      Acertou: {answererName}
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
              <section aria-label="Timeline de eventos">
                <SectionTitle>Timeline</SectionTitle>
                <ul className="flex flex-col gap-1" role="list">
                  {detail.timeline.map((entry) => (
                    <TimelineRow key={entry.event_id} entry={entry} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
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
  const label = entry.type === 'trivia' ? 'Trivia' : 'Mímica'
  const pts = entry.voided ? 'anulado' : `+${entry.points} pts`
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
      <span className="shrink-0 text-[var(--color-muted)]">{formatTimeShort(entry.occurred_at)}</span>
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
