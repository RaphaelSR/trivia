import { HelpCircle, Minus, Plus, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './Button'
import { Modal } from './Modal'
import { Timer } from './Timer'
import { Tooltip } from './Tooltip'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'

type MimicaModalProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeParticipant: TriviaParticipant | null
  turnSequence: string[]
  onAdvanceTurn: () => void
  onScore: (
    mode: ScoringMode,
    targetTeamId: string | undefined,
    points: number,
    turnNumber: number,
    roundNumber: number
  ) => void
}

type ScoringMode = 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void'

const TIMER_PRESETS = [30, 45, 60, 90, 120]

/**
 * Modal para modo mímica com lista de participantes alternada
 */
export function MimicaModal({
  isOpen,
  onClose,
  teams,
  participants,
  activeParticipant,
  turnSequence,
  onAdvanceTurn,
  onScore,
}: MimicaModalProps) {
  const [scoringMode, setScoringMode] = useState<ScoringMode | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [mimicaPoints, setMimicaPoints] = useState(50)
  const [shuffleMode, setShuffleMode] = useState<'alternate' | 'shuffle' | 'team-shuffle'>('alternate')
  const [shuffledSequence, setShuffledSequence] = useState<string[]>([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [timerSeconds, setTimerSeconds] = useState(60)
  const [timerResetKey, setTimerResetKey] = useState(0)

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    if (isOpen) {
      setRoundNumber(1)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && turnSequence.length > 0) {
      let newSequence: string[] = []

      switch (shuffleMode) {
        case 'alternate': {
          const participantsByTeam = teams.map(team => ({
            team,
            members: participants.filter(p => p.teamId === team.id)
          }))
          const maxMembers = Math.max(...participantsByTeam.map(t => t.members.length))

          for (let i = 0; i < maxMembers; i++) {
            participantsByTeam.forEach(({ members }) => {
              if (members[i]) {
                newSequence.push(members[i].id)
              }
            })
          }
          break
        }

        case 'shuffle':
          newSequence = shuffleArray(turnSequence)
          break

        case 'team-shuffle': {
          const shuffledByTeam = teams.map(team => ({
            team,
            members: shuffleArray(participants.filter(p => p.teamId === team.id).map(p => p.id))
          }))
          const maxShuffledMembers = Math.max(...shuffledByTeam.map(t => t.members.length))

          for (let i = 0; i < maxShuffledMembers; i++) {
            shuffledByTeam.forEach(({ members }) => {
              if (members[i]) {
                newSequence.push(members[i])
              }
            })
          }
          break
        }
      }

      setShuffledSequence(newSequence)
    }
  }, [isOpen, turnSequence, shuffleMode, teams, participants])

  const alternateParticipants = useMemo(() => {
    const sequenceToUse = shuffledSequence.length > 0 ? shuffledSequence : turnSequence
    return sequenceToUse
      .map(id => participants.find(p => p.id === id))
      .filter((p): p is TriviaParticipant => p !== undefined)
  }, [shuffledSequence, turnSequence, participants])

  const currentParticipantIndex = useMemo(() => {
    if (!activeParticipant) return 0
    return alternateParticipants.findIndex(p => p.id === activeParticipant.id)
  }, [activeParticipant, alternateParticipants])

  const turnNumber = useMemo(() => {
    return (roundNumber - 1) * alternateParticipants.length + currentParticipantIndex + 1
  }, [roundNumber, currentParticipantIndex, alternateParticipants.length])

  const nextParticipant = useMemo(() => {
    const nextIndex = (currentParticipantIndex + 1) % alternateParticipants.length
    return alternateParticipants[nextIndex]
  }, [currentParticipantIndex, alternateParticipants])

  const activeTeam = useMemo(() => {
    if (!activeParticipant) return null
    return teams.find(team => team.id === activeParticipant.teamId) ?? null
  }, [activeParticipant, teams])

  const stealTargets = useMemo(
    () => teams.filter(team => team.id !== activeTeam?.id),
    [teams, activeTeam]
  )

  const handleClose = () => {
    setScoringMode(null)
    setSelectedTeam(null)
    onClose()
  }

  const handleScore = (mode: ScoringMode, targetTeamId?: string) => {
    let points = mimicaPoints
    switch (mode) {
      case 'full-current':
        points = mimicaPoints
        break
      case 'half-current':
        points = Math.round(mimicaPoints / 2)
        break
      case 'steal':
        points = mimicaPoints
        break
      case 'everyone':
        points = Math.round(mimicaPoints / teams.length)
        break
      case 'void':
        points = 0
        break
    }

    onScore(mode, targetTeamId, points, turnNumber, roundNumber)
    setScoringMode(null)
    setSelectedTeam(null)
    setTimerResetKey(k => k + 1)

    setTimeout(() => {
      if (currentParticipantIndex < alternateParticipants.length - 1) {
        onAdvanceTurn()
        if (nextParticipant) {
          toast.success(`Próximo turno: ${nextParticipant.name}`)
        }
      } else {
        setRoundNumber(prev => prev + 1)
        onAdvanceTurn()
        if (alternateParticipants[0]) {
          toast.success(`Volta ${roundNumber + 1} iniciada! Próximo turno: ${alternateParticipants[0].name}`)
        }
      }
    }, 500)
  }

  const scoringOptions: Array<{ id: ScoringMode; label: string; pts: number }> = [
    { id: 'full-current', label: '100%', pts: mimicaPoints },
    { id: 'half-current', label: '50%', pts: Math.round(mimicaPoints / 2) },
    { id: 'steal', label: 'Roubo', pts: mimicaPoints },
    { id: 'everyone', label: 'Todos', pts: Math.round(mimicaPoints / teams.length) },
    { id: 'void', label: 'Anular', pts: 0 },
  ]

  const canConfirm = scoringMode !== null && (scoringMode !== 'steal' || (scoringMode === 'steal' && selectedTeam !== null))

  return (
    <Modal
      isOpen={isOpen}
      title="Modo Mímica"
      description="Cada participante faz sua vez na ordem alternada."
      onClose={handleClose}
    >
      <div className="space-y-5 text-[var(--color-text)]">
        {/* Participante atual + próximo */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activeTeam?.color }}
            />
            <div>
              <p className="text-sm font-semibold">
                {activeParticipant?.name ?? 'Aguardando'}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {activeTeam?.name} · Volta {roundNumber} · Turno {turnNumber}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--color-muted)]">
            <span>Próximo: </span>
            <span className="font-medium text-[var(--color-text)]">{nextParticipant?.name ?? '—'}</span>
          </div>
        </div>

        {/* Timer com presets */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">Timer</span>
            <div className="flex items-center gap-1 ml-auto">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimerSeconds(preset)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                    timerSeconds === preset
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-border)]/40 text-[var(--color-muted)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {preset}s
                </button>
              ))}
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={() => setTimerSeconds(s => Math.max(10, s - 10))}
                  className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                  title="−10 segundos"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTimerSeconds(s => Math.min(300, s + 10))}
                  className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                  title="+10 segundos"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          <Timer
            key={timerResetKey}
            initialSeconds={timerSeconds}
            variant="compact"
            editable
          />
        </div>

        {/* Pontuação inline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Pontuação
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMimicaPoints(p => Math.max(10, p - 10))}
                className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                title="−10 pontos"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-bold text-[var(--color-primary)]">{mimicaPoints} pts</span>
              <button
                type="button"
                onClick={() => setMimicaPoints(p => Math.min(500, p + 10))}
                className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                title="+10 pontos"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {scoringOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScoringMode(opt.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition ${
                  scoringMode === opt.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                }`}
              >
                <span className="text-xs font-semibold text-[var(--color-text)]">{opt.label}</span>
                <span className="text-[10px] text-[var(--color-muted)]">{opt.pts} pts</span>
              </button>
            ))}
          </div>

          {scoringMode === 'steal' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">Para:</span>
              <div className="flex gap-1.5">
                {stealTargets.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      selectedTeam === team.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            variant={scoringMode ? 'secondary' : 'outline'}
            disabled={!canConfirm}
            onClick={() => handleScore(scoringMode ?? 'full-current', scoringMode === 'steal' ? selectedTeam ?? undefined : undefined)}
            className="w-full"
          >
            Confirmar e avançar
          </Button>
        </div>

        {/* Ordem de participação - colapsada */}
        <details className="rounded-xl border border-[var(--color-border)]">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <span className="flex items-center gap-2">
              <UsersRound size={14} />
              Ordem ({alternateParticipants.length})
            </span>
            <span className="text-[10px] normal-case tracking-normal">
              {shuffleMode === 'alternate' ? 'Alternada' : shuffleMode === 'shuffle' ? 'Aleatória' : 'Por time'}
            </span>
          </summary>
          <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-3">
            <div className="flex gap-1.5">
              {([
                { id: 'alternate', label: 'Alternada' },
                { id: 'shuffle', label: 'Aleatória' },
                { id: 'team-shuffle', label: 'Por time' },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShuffleMode(opt.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    shuffleMode === opt.id
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-border)]/40 text-[var(--color-muted)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <Tooltip content="A mímica continua até você fechar. Quando todos participaram, recomeça do primeiro.">
                <HelpCircle size={14} className="ml-1 self-center text-[var(--color-muted)] cursor-help" />
              </Tooltip>
            </div>

            <div className="space-y-1">
              {alternateParticipants.map((participant, index) => {
                const participantTeam = teams.find(team => team.id === participant.teamId)
                const isActive = participant.id === activeParticipant?.id
                const isCompleted = index < currentParticipantIndex

                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--color-primary)]/10 font-semibold'
                        : isCompleted
                        ? 'text-[var(--color-muted)] line-through opacity-50'
                        : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: participantTeam?.color }}
                      />
                      {participant.name}
                    </span>
                    <span className="text-[var(--color-muted)]">{participantTeam?.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </details>

        <Button variant="outline" onClick={handleClose} className="w-full">
          Fechar mímica
        </Button>
      </div>
    </Modal>
  )
}
