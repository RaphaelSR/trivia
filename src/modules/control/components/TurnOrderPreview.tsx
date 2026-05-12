import { useMemo } from 'react'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import {
  buildTurnPreviewGroups,
  getRecommendedPreviewTurnCount,
} from '@/modules/game/domain/turn-order'

type TurnOrderPreviewProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  turnSequenceLength?: number
  maxGroups?: number
  title?: string
  description?: string
}

export function TurnOrderPreview({
  teams,
  participants,
  turnSequenceLength = 0,
  maxGroups = 2,
  title = 'Ordem prevista da partida',
  description = 'A rodada fecha quando todos os participantes aparecerem pelo menos uma vez.',
}: TurnOrderPreviewProps) {
  const previewTurnCount = useMemo(() => {
    const suggested = getRecommendedPreviewTurnCount(teams, maxGroups)
    return Math.max(turnSequenceLength, suggested)
  }, [maxGroups, teams, turnSequenceLength])

  const previewGroups = useMemo(() => {
    return buildTurnPreviewGroups(teams, participants, previewTurnCount, maxGroups)
  }, [maxGroups, participants, previewTurnCount, teams])

  const previewHint = useMemo(() => {
    if (!teams.length || !participants.length) {
      return 'Adicione ao menos dois times com participantes para ver a prévia.'
    }

    if (turnSequenceLength === 0) {
      return 'Prévia estimada pela ordem dos times. Ela já mostra como a rotação deve acontecer quando houver perguntas suficientes.'
    }

    if (previewTurnCount > turnSequenceLength) {
      return 'Prévia estendida para mostrar melhor o ciclo de repetição entre times de tamanhos diferentes.'
    }

    return 'Cada rodada mostra todos os participantes que precisam aparecer antes do ciclo fechar.'
  }, [participants.length, previewTurnCount, teams.length, turnSequenceLength])

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Preview de turnos</p>
          <h4 className="text-base font-semibold text-[var(--color-text)]">{title}</h4>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">{description}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-text)]">
        {previewHint}
      </div>

      {previewGroups.length ? (
        <div className="mt-4 grid gap-3">
          {previewGroups.map((group) => (
            <article
              key={`${group.label}-${group.number}`}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-[var(--color-text)]">{group.label}</h5>
                  {group.isPartial ? (
                    <span className="rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
                      Parcial
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-[var(--color-muted)]">{group.entries.length} turnos</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {group.entries.map((entry) => (
                  <div
                    key={`${group.label}-${entry.turnNumber}-${entry.participantId}`}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                  >
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                      {entry.turnNumber}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.teamColor }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-[var(--color-text)]">{entry.participantName}</span>
                    <span className="text-[var(--color-muted)]">· {entry.teamName}</span>
                    {entry.repeatedInGroup ? (
                      <span className="rounded-full bg-[var(--color-secondary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                        Repete
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          A prévia aparece quando houver times e participantes suficientes para montar a ordem.
        </div>
      )}
    </section>
  )
}
