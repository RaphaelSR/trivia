import { ListOrdered, RefreshCw, UsersRound } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import {
  buildTurnPreviewGroups,
  buildTurnPreviewGroupsFromSequence,
  getRecommendedPreviewTurnCount,
} from '@/modules/game/domain/turn-order'

type TurnOrderPreviewProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  turnSequence?: string[]
  sequenceSource?: 'session' | 'draft'
  activeTurnIndex?: number
  maxGroups?: number
  title?: string
  description?: string
  onReorganize?: () => void
}

export function TurnOrderPreview({
  teams,
  participants,
  turnSequence = [],
  sequenceSource = 'session',
  activeTurnIndex = 0,
  maxGroups = 2,
  title = 'Ordem prevista da partida',
  description = 'A rodada fecha quando todos os participantes aparecerem pelo menos uma vez.',
  onReorganize,
}: TurnOrderPreviewProps) {
  const previewGroups = useMemo(() => {
    if (turnSequence.length) {
      const allGroups = buildTurnPreviewGroupsFromSequence(teams, participants, turnSequence)
      if (allGroups.length <= maxGroups) return allGroups

      const activeGroupIndex = allGroups.findIndex(group =>
        group.entries.some(entry => entry.turnNumber === activeTurnIndex + 1)
      )
      const start = Math.max(0, Math.min(activeGroupIndex, allGroups.length - maxGroups))
      return allGroups.slice(start, start + maxGroups)
    }

    const count = getRecommendedPreviewTurnCount(teams, maxGroups)
    return buildTurnPreviewGroups(teams, participants, count, maxGroups)
  }, [activeTurnIndex, maxGroups, participants, teams, turnSequence])

  const previewHint = useMemo(() => {
    if (!teams.length || !participants.length) {
      return 'Adicione ao menos dois times com participantes para ver a prévia.'
    }
    if (!turnSequence.length) {
      return 'Prévia estimada pela ordem dos times. Ela mostra como a rotação deve acontecer quando houver perguntas suficientes.'
    }
    if (sequenceSource === 'draft') {
      return 'Prévia calculada com o rascunho atual. Ela só passa a valer no jogo depois de salvar os times.'
    }
    return 'Esta é a sequência real salva na sessão. Turnos concluídos ficam atenuados e o turno atual aparece em destaque.'
  }, [participants.length, sequenceSource, teams.length, turnSequence.length])

  const playableTeams = teams.filter(team => team.members.length > 0).length
  const shownTurns = previewGroups.reduce((total, group) => total + group.entries.length, 0)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Preview de turnos</p>
          <h4 className="text-base font-semibold text-[var(--color-text)]">{title}</h4>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">{description}</p>
        </div>
        {onReorganize ? (
          <Button variant="outline" onClick={onReorganize} className="shrink-0">
            <RefreshCw size={15} />
            Reorganizar próximos
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { icon: UsersRound, label: 'Times jogando', value: playableTeams },
          { icon: UsersRound, label: 'Participantes', value: participants.length },
          { icon: ListOrdered, label: 'Turnos exibidos', value: shownTurns },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <item.icon size={16} className="text-[var(--color-primary)]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{item.label}</p>
              <p className="text-sm font-bold text-[var(--color-text)]">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-text)]">
        {previewHint}
      </div>

      {previewGroups.length ? (
        <div className="mt-4 grid gap-3">
          {previewGroups.map(group => (
            <article key={`${group.label}-${group.number}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-[var(--color-text)]">{group.label}</h5>
                  {group.isPartial ? <span className="rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary)]">Parcial</span> : null}
                </div>
                <span className="text-xs text-[var(--color-muted)]">{group.entries.length} turnos</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.entries.map(entry => {
                  const isCurrent = turnSequence.length > 0 && entry.turnNumber === activeTurnIndex + 1
                  const isPast = turnSequence.length > 0 && entry.turnNumber < activeTurnIndex + 1
                  return (
                    <div key={`${group.label}-${entry.turnNumber}-${entry.participantId}`} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${isCurrent ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] bg-[var(--color-background)]'} ${isPast ? 'opacity-50' : ''}`}>
                      <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">{entry.turnNumber}</span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.teamColor }} aria-hidden="true" />
                      <span className="font-medium text-[var(--color-text)]">{entry.participantName}</span>
                      <span className="text-[var(--color-muted)]">· {entry.teamName}</span>
                      {isCurrent ? <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Atual</span> : null}
                      {entry.repeatedInGroup ? <span className="rounded-full bg-[var(--color-secondary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Repete</span> : null}
                    </div>
                  )
                })}
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
