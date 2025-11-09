import { Button } from '@/components/ui/Button'
import type { TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'
import type { PointDistribution, QuickScoringOption } from '../types/control.types'
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

/**
 * Componente flexível de pontuação
 */
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
    quickModeSelected,
    selectedQuickOption,
    quickOptions,
    isValid,
    applyQuickOption,
    updateTeamDistribution,
    getTeamParticipants,
  } = useScoringSystem(participants, activeTeamId, activeParticipantId, basePoints)

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-1">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
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
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'advanced'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Avançado
        </button>
      </div>

      {mode === 'quick' && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            Opções Rápidas
          </div>
          <div className="grid gap-2">
            {quickOptions.map((option) => {
              const isSelected = selectedQuickOption === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyQuickOption(option)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {isSelected ? '✓ ' : ''}{option.title}
                      </span>
                      <p className="text-xs text-[var(--color-muted)]">{option.subtitle}</p>
                    </div>
                    <span className="text-lg font-bold text-[var(--color-primary)]">
                      {Math.round(basePoints * option.multiplier)} pts
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'advanced' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            Distribuição Personalizada
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Multiplicador
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 0.5, label: '0.5x', desc: 'Meio' },
                { value: 1.0, label: '1x', desc: 'Cheio' },
                { value: 1.5, label: '1.5x', desc: 'Bônus' },
              ].map((mult) => (
                <button
                  key={mult.value}
                  type="button"
                  onClick={() => setSelectedMultiplier(mult.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    selectedMultiplier === mult.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]'
                  }`}
                >
                  <div className="font-semibold">{mult.label}</div>
                  <div className="text-xs text-[var(--color-muted)]">{mult.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[var(--color-text)]">
              Quem recebe os pontos?
            </div>

            {teams.map((team) => {
              const teamDistribution = distributions.find((d) => d.teamId === team.id)
              const teamPoints = teamDistribution?.points || 0
              const calculatedPoints = Math.round(basePoints * selectedMultiplier)

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {team.name}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {teamPoints} pts
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateTeamDistribution(team.id, calculatedPoints)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                        teamPoints > 0
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]'
                      }`}
                    >
                      {teamPoints > 0 ? '✓ Selecionado' : `Dar ${calculatedPoints} pts`}
                    </button>

                    {teamPoints > 0 && (
                      <button
                        type="button"
                        onClick={() => updateTeamDistribution(team.id, 0)}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {teamPoints > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                        Para quem no time?
                      </label>
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
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                      >
                        <option value="">Time inteiro</option>
                        {getTeamParticipants(team.id).map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {distributions.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                Resumo
              </div>
              <div className="space-y-1">
                {distributions.map((dist, index) => {
                  const team = teams.find((t) => t.id === dist.teamId)
                  const participant = dist.participantId
                    ? participants.find((p) => p.id === dist.participantId)
                    : null

                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-[var(--color-text)]">
                        {team?.name}
                        {participant && ` (${participant.name})`}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {dist.points} pts
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant={isValid ? 'secondary' : 'outline'}
          disabled={!isValid}
          onClick={() => onConfirm(distributions)}
          className="flex-1"
        >
          Confirmar pontuação
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Fechar
        </Button>
      </div>
    </div>
  )
}

