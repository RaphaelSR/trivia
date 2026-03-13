import { Button } from '@/components/ui/Button'
import type { TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'
import type { PointDistribution } from '../types/control.types'
import { useScoringSystem } from '../hooks/useScoringSystem'

type ScoringControlsProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeTeamId: string | null
  activeParticipantId: string | null
  basePoints: number
  onConfirm: (distributions: PointDistribution[]) => void
  onClose: () => void
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
  const {
    mode,
    setMode,
    distributions,
    setDistributions,
    selectedMultiplier,
    setSelectedMultiplier,
    quickModeSelected: _quickModeSelected,
    selectedQuickOption,
    quickOptions,
    isValid,
    applyQuickOption,
    updateTeamDistribution,
    getTeamParticipants,
  } = useScoringSystem(participants, activeTeamId, activeParticipantId, basePoints)

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-0.5">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition ${
            mode === 'quick'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Rápido
        </button>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition ${
            mode === 'advanced'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Avançado
        </button>
      </div>

      {mode === 'quick' && (
        <div className="grid grid-cols-2 gap-1.5">
          {quickOptions.map((option) => {
            const isSelected = selectedQuickOption === option.id
            return (
              <button
                key={option.id}
                type="button"
                title={option.subtitle}
                onClick={() => applyQuickOption(option)}
                className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-[var(--color-text)] truncate">
                    {isSelected ? '✓ ' : ''}{option.title}
                  </span>
                  <span className="shrink-0 font-bold text-[var(--color-primary)]">
                    {Math.round(basePoints * option.multiplier)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {mode === 'advanced' && (
        <div className="space-y-3">
          {/* Multiplicadores */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 0.5, label: '0.5×' },
              { value: 1.0, label: '1×' },
              { value: 1.5, label: '1.5×' },
            ].map((mult) => (
              <button
                key={mult.value}
                type="button"
                onClick={() => setSelectedMultiplier(mult.value)}
                className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
                  selectedMultiplier === mult.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]'
                }`}
              >
                {mult.label}
              </button>
            ))}
          </div>

          {/* Times */}
          <div className="space-y-1.5">
            {teams.map((team) => {
              const teamDistribution = distributions.find((d) => d.teamId === team.id)
              const teamPoints = teamDistribution?.points || 0
              const calculatedPoints = Math.round(basePoints * selectedMultiplier)

              return (
                <div key={team.id} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="flex-1 truncate text-xs font-medium text-[var(--color-text)]">{team.name}</span>
                  {teamPoints > 0 ? (
                    <>
                      <span className="text-xs font-bold text-[var(--color-primary)]">{teamPoints} pts</span>
                      <button
                        type="button"
                        onClick={() => updateTeamDistribution(team.id, 0)}
                        className="rounded border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/20"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateTeamDistribution(team.id, calculatedPoints)}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
                    >
                      +{calculatedPoints}
                    </button>
                  )}
                  {teamPoints > 0 && (
                    <select
                      value={teamDistribution?.participantId || ''}
                      onChange={(e) => {
                        const participantId = e.target.value || undefined
                        setDistributions((prev) =>
                          prev.map((d) =>
                            d.teamId === team.id ? { ...d, participantId } : d
                          )
                        )
                      }}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)]"
                    >
                      <option value="">Time inteiro</option>
                      {getTeamParticipants(team.id).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>

          {distributions.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs">
              {distributions.map((dist, i) => {
                const team = teams.find((t) => t.id === dist.teamId)
                const participant = dist.participantId ? participants.find((p) => p.id === dist.participantId) : null
                return (
                  <div key={i} className="flex justify-between">
                    <span className="text-[var(--color-muted)]">{team?.name}{participant && ` (${participant.name})`}</span>
                    <span className="font-semibold text-[var(--color-primary)]">{dist.points} pts</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant={isValid ? 'secondary' : 'outline'}
          disabled={!isValid}
          onClick={() => onConfirm(distributions)}
          className="flex-1"
          size="sm"
        >
          Confirmar
        </Button>
        <Button variant="ghost" onClick={onClose} size="sm">
          Fechar
        </Button>
      </div>
    </div>
  )
}
