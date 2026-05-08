import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import type { PointDistribution } from '../types/control.types'
import { ScoreRecipientEditor } from './ScoreRecipientEditor'

type ScoringControlsProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeTeamId: string | null
  activeParticipantId: string | null
  basePoints: number
  onConfirm: (distributions: PointDistribution[]) => void
  onClose: () => void
}

type ScoreOutcome = 'full' | 'half' | 'none' | 'custom'

type OutcomeOption = {
  id: ScoreOutcome
  title: string
  description: string
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    id: 'full',
    title: 'Acertou',
    description: 'Valor cheio',
  },
  {
    id: 'half',
    title: 'Parcial',
    description: 'Meio valor',
  },
  {
    id: 'none',
    title: 'Sem pontos',
    description: 'Anular',
  },
  {
    id: 'custom',
    title: 'Personalizar',
    description: 'Editar destino',
  },
]

function getParticipantsByTeam(participants: TriviaParticipant[], teamId: string) {
  return participants.filter((participant) => participant.teamId === teamId)
}

function buildDistribution(
  teamId: string,
  points: number,
  participantId?: string | null,
): PointDistribution {
  return {
    teamId,
    points,
    participantId: participantId ?? undefined,
    percentage: undefined,
  }
}

export function ScoringControls({
  teams,
  participants,
  activeTeamId,
  activeParticipantId,
  basePoints,
  onConfirm,
  onClose,
}: ScoringControlsProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<ScoreOutcome | null>(null)
  const [customModeOpen, setCustomModeOpen] = useState(false)
  const [suggestedPoints, setSuggestedPoints] = useState(basePoints)
  const [customPointsInput, setCustomPointsInput] = useState(String(basePoints))
  const [distributions, setDistributions] = useState<PointDistribution[]>([])

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [activeTeamId, teams],
  )

  useEffect(() => {
    setSelectedOutcome(null)
    setCustomModeOpen(false)
    setSuggestedPoints(basePoints)
    setCustomPointsInput(String(basePoints))
    setDistributions([])
  }, [activeParticipantId, activeTeamId, basePoints])

  const applyOutcome = (outcome: ScoreOutcome) => {
    setSelectedOutcome(outcome)

    if (outcome === 'custom') {
      setCustomModeOpen(true)
      setDistributions([])
      setSuggestedPoints(Math.max(0, Number(customPointsInput) || basePoints))
      return
    }

    if (outcome === 'none') {
      setCustomModeOpen(false)
      setDistributions([])
      return
    }

    const nextSuggestedPoints =
      outcome === 'full'
        ? basePoints
        : outcome === 'half'
          ? Math.round(basePoints / 2)
          : Math.max(0, Number(customPointsInput) || 0)

    setSuggestedPoints(nextSuggestedPoints)
    setCustomModeOpen(false)

    if (!activeTeamId) {
      setDistributions([])
      return
    }

    setDistributions([
      buildDistribution(activeTeamId, nextSuggestedPoints, activeParticipantId),
    ])
  }

  const updateDistribution = (teamId: string, updater: (current?: PointDistribution) => PointDistribution | null) => {
    setDistributions((current) => {
      const existing = current.find((distribution) => distribution.teamId === teamId)
      const next = updater(existing)
      const remaining = current.filter((distribution) => distribution.teamId !== teamId)

      if (!next || next.points <= 0) {
        return remaining
      }

      return [...remaining, next]
    })
  }

  const handleSuggestedPointsSelect = (points: number) => {
    setSuggestedPoints(points)
    setCustomPointsInput(String(points))

    setDistributions((current) =>
      current.map((distribution) => ({
        ...distribution,
        points,
      })),
    )
  }

  const handleCustomPointsChange = (rawValue: string) => {
    setCustomPointsInput(rawValue)
    const nextValue = Math.max(0, Number(rawValue) || 0)
    setSuggestedPoints(nextValue)

    setDistributions((current) =>
      current.map((distribution) => ({
        ...distribution,
        points: nextValue,
      })),
    )
  }

  const isValid =
    selectedOutcome === 'none'
      ? true
      : distributions.some((distribution) => distribution.points > 0)

  const totalPoints = distributions.reduce((sum, distribution) => sum + distribution.points, 0)
  const confirmLabel = selectedOutcome === 'none' ? 'Anular pergunta' : 'Aplicar pontuação'
  const selectedSummary =
    selectedOutcome === null
      ? 'Escolha um resultado.'
      : selectedOutcome === 'none'
        ? 'Sem pontuação.'
        : customModeOpen
          ? `${distributions.length} destino(s), ${totalPoints} pts.`
          : `${activeTeam?.name ?? 'Time da vez'} recebe ${totalPoints} pts.`

  return (
    <div className="space-y-3">
      {customModeOpen ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Personalizar
              </p>
              <button
                type="button"
                onClick={() => {
                  setCustomModeOpen(false)
                  setSelectedOutcome(null)
                  setDistributions([])
                }}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Voltar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={customPointsInput}
                onChange={(event) => handleCustomPointsChange(event.target.value)}
                aria-label="Valor customizado"
                className="h-9 w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
              {[
                { label: 'Cheio', points: basePoints },
                { label: 'Metade', points: Math.round(basePoints / 2) },
              ].map((preset) => (
                <button
                  key={`${preset.label}-${preset.points}`}
                  type="button"
                  onClick={() => handleSuggestedPointsSelect(preset.points)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    suggestedPoints === preset.points
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Quem recebe
              </p>

              <div className="mt-2 space-y-2">
                {teams.map((team) => {
                  const distribution = distributions.find((item) => item.teamId === team.id)
                  const teamParticipants = getParticipantsByTeam(participants, team.id)

                  return (
                    <ScoreRecipientEditor
                      key={team.id}
                      team={team}
                      participants={teamParticipants}
                      distribution={distribution}
                      suggestedPoints={suggestedPoints}
                      isActiveTeam={team.id === activeTeamId}
                      onToggle={(enabled) => {
                        updateDistribution(team.id, () =>
                          enabled
                            ? buildDistribution(
                                team.id,
                                suggestedPoints,
                              )
                            : null,
                        )
                      }}
                      onPointsChange={(points) => {
                        updateDistribution(team.id, (current) =>
                          buildDistribution(
                            team.id,
                            points,
                            current?.participantId,
                          )
                        )
                      }}
                      onParticipantChange={(participantId) => {
                        updateDistribution(team.id, (current) =>
                          buildDistribution(team.id, current?.points ?? suggestedPoints, participantId),
                        )
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Resultado
            </p>
            <span className="text-xs font-semibold text-[var(--color-primary)]">{basePoints} pts</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {OUTCOME_OPTIONS.map((option) => {
              const isSelected = selectedOutcome === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyOutcome(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{option.title}</span>
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-label="Selecionado" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">{option.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={isValid ? 'secondary' : 'outline'}
          disabled={!isValid || selectedOutcome === null}
          onClick={() => onConfirm(distributions)}
          className="flex-1"
          size="sm"
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onClose} size="sm">
          Fechar
        </Button>
      </div>
      <p className="text-center text-[11px] font-medium text-[var(--color-muted)]">{selectedSummary}</p>
    </div>
  )
}
