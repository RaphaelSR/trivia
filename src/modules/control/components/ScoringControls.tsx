import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import type { PointDistribution } from '../types/control.types'
import { ScoreRecipientEditor } from './ScoreRecipientEditor'
import { useTranslation } from '@/shared/i18n'

type ScoringControlsProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeTeamId: string | null
  activeParticipantId: string | null
  basePoints: number
  onConfirm: (distributions: PointDistribution[]) => void
  onClose: () => void
}

type ScoreOutcome = 'full' | 'half' | 'missed' | 'none' | 'custom'

type OutcomeOption = {
  id: ScoreOutcome
  title: string
  description: string
}

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
  const { t } = useTranslation(['control', 'common'])
  const outcomeOptions: OutcomeOption[] = [
    { id: 'full', title: t('scoring.outcomes.full.title', { ns: 'control' }), description: t('scoring.outcomes.full.description', { ns: 'control' }) },
    { id: 'half', title: t('scoring.outcomes.half.title', { ns: 'control' }), description: t('scoring.outcomes.half.description', { ns: 'control' }) },
    { id: 'missed', title: t('scoring.outcomes.missed.title', { ns: 'control' }), description: t('scoring.outcomes.missed.description', { ns: 'control' }) },
    { id: 'none', title: t('scoring.outcomes.none.title', { ns: 'control' }), description: t('scoring.outcomes.none.description', { ns: 'control' }) },
    { id: 'custom', title: t('scoring.outcomes.custom.title', { ns: 'control' }), description: t('scoring.outcomes.custom.description', { ns: 'control' }) },
  ]
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

    if (outcome === 'missed') {
      const halfPoints = Math.round(basePoints / 2)
      setSuggestedPoints(halfPoints)
      setCustomModeOpen(false)
      setDistributions(
        teams
          .filter((team) => team.id !== activeTeamId)
          .map((team) => buildDistribution(team.id, halfPoints)),
      )
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
  const confirmLabel = selectedOutcome === 'none' ? t('scoring.voidQuestion', { ns: 'control' }) : t('scoring.apply', { ns: 'control' })
  const selectedSummary =
    selectedOutcome === null
      ? t('scoring.chooseOutcome', { ns: 'control' })
      : selectedOutcome === 'none'
        ? t('scoring.noPoints', { ns: 'control' })
        : customModeOpen
          ? t('scoring.customSummary', { ns: 'control', destinations: distributions.length, points: totalPoints })
          : selectedOutcome === 'missed'
            ? t('scoring.missedSummary', { ns: 'control', team: activeTeam?.name ?? t('scoring.currentTeamFallback', { ns: 'control' }), teams: distributions.length, points: suggestedPoints })
            : t('scoring.receivedSummary', { ns: 'control', team: activeTeam?.name ?? t('scoring.currentTeamFallback', { ns: 'control' }), points: totalPoints })

  return (
    <div className="space-y-3">
      {customModeOpen ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {t('scoring.customize', { ns: 'control' })}
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
                {t('actions.back', { ns: 'common' })}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={customPointsInput}
                onChange={(event) => handleCustomPointsChange(event.target.value)}
                aria-label={t('scoring.customValue', { ns: 'control' })}
                className="h-9 w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
              />
              {[
                { label: t('scoring.fullPreset', { ns: 'control' }), points: basePoints },
                { label: t('scoring.halfPreset', { ns: 'control' }), points: Math.round(basePoints / 2) },
              ].map((preset) => (
                <button
                  key={`${preset.label}-${preset.points}`}
                  type="button"
                  onClick={() => handleSuggestedPointsSelect(preset.points)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    suggestedPoints === preset.points
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {t('scoring.recipients', { ns: 'control' })}
                </p>
                {/* Atalho para o roubo em cadeia: preenche todos exceto o time
                    da vez com metade; daí é só remover quem errou por último. */}
                <button
                  type="button"
                  onClick={() => {
                    const halfPoints = Math.round(basePoints / 2)
                    setSuggestedPoints(halfPoints)
                    setCustomPointsInput(String(halfPoints))
                    setDistributions(
                      teams
                        .filter((team) => team.id !== activeTeamId)
                        .map((team) => buildDistribution(team.id, halfPoints)),
                    )
                  }}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]/40"
                >
                  {t('scoring.otherTeamsHalf', { ns: 'control' })}
                </button>
              </div>

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
              {t('scoring.result', { ns: 'control' })}
            </p>
            <span className="text-xs font-semibold text-[var(--color-primary)]">{t('entities.pointsShort', { ns: 'common', count: basePoints })}</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {outcomeOptions.map((option) => {
              const isSelected = selectedOutcome === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyOutcome(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    option.id === 'custom' ? 'col-span-2 ' : ''
                  }${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{option.title}</span>
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-label={t('scoring.selected', { ns: 'control' })} />
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
          {t('actions.close', { ns: 'common' })}
        </Button>
      </div>
      <p className="text-center text-[11px] font-medium text-[var(--color-muted)]">{selectedSummary}</p>
    </div>
  )
}
