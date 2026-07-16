import { HelpCircle, Minus, Plus, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './Button'
import { Modal } from './Modal'
import { Timer } from './Timer'
import { Tooltip } from './Tooltip'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'
import { ParticipantAvatar } from '../../shared/components/ParticipantAvatar'
import type { ParticipantIdentity } from '../../modules/auth/services/profile-avatar.service'
import {
  buildMimicaTurnSequence,
  getMimicaStartIndex,
  type MimicaOrderMode,
  type MimicaStartMode,
} from '../../modules/game/domain/mimica-turn-order'

type MimicaModalProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  triviaActiveParticipantId: string | null
  triviaActiveTurnIndex: number
  participantIdentities?: Record<string, ParticipantIdentity>
  onScore: (
    participantId: string,
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
  triviaActiveParticipantId,
  triviaActiveTurnIndex,
  participantIdentities = {},
  onScore,
}: MimicaModalProps) {
  const [scoringMode, setScoringMode] = useState<ScoringMode | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [mimicaPoints, setMimicaPoints] = useState(50)
  const [orderMode, setOrderMode] = useState<MimicaOrderMode>('alternate')
  const [startMode, setStartMode] = useState<MimicaStartMode>('continue')
  const [mimicaSequence, setMimicaSequence] = useState<string[]>([])
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [timerSeconds, setTimerSeconds] = useState(60)
  const [timerResetKey, setTimerResetKey] = useState(0)

  const rosterSignature = useMemo(
    () => JSON.stringify({
      teams: teams.map(team => ({ id: team.id, order: team.order, members: team.members })),
      participants: participants.map(participant => ({ id: participant.id, teamId: participant.teamId })),
    }),
    [teams, participants]
  )
  const rosterRef = useRef({ signature: '', teams, participants })
  if (rosterRef.current.signature !== rosterSignature) {
    rosterRef.current = { signature: rosterSignature, teams, participants }
  }

  useEffect(() => {
    if (isOpen) {
      const roster = rosterRef.current
      setMimicaSequence(buildMimicaTurnSequence(roster.teams, roster.participants, orderMode))
    }
  }, [isOpen, orderMode, rosterSignature])

  useEffect(() => {
    if (!isOpen || !mimicaSequence.length) return
    setRoundNumber(1)
    setCurrentParticipantIndex(
      getMimicaStartIndex(
        mimicaSequence,
        startMode,
        triviaActiveParticipantId,
        triviaActiveTurnIndex
      )
    )
  }, [isOpen, mimicaSequence, startMode, triviaActiveParticipantId, triviaActiveTurnIndex])

  const alternateParticipants = useMemo(() => {
    return mimicaSequence
      .map(id => participants.find(p => p.id === id))
      .filter((p): p is TriviaParticipant => p !== undefined)
  }, [mimicaSequence, participants])

  const activeParticipant = alternateParticipants[currentParticipantIndex] ?? null

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

    if (!activeParticipant) return
    onScore(activeParticipant.id, mode, targetTeamId, points, turnNumber, roundNumber)
    setScoringMode(null)
    setSelectedTeam(null)
    setTimerResetKey(k => k + 1)

    setTimeout(() => {
      if (currentParticipantIndex < alternateParticipants.length - 1) {
        setCurrentParticipantIndex(index => index + 1)
        if (nextParticipant) {
          toast.success(`Próximo turno: ${nextParticipant.name}`)
        }
      } else {
        setRoundNumber(prev => prev + 1)
        setCurrentParticipantIndex(0)
        if (alternateParticipants[0]) {
          toast.success(`Rodada ${roundNumber + 1} iniciada! Próximo turno: ${alternateParticipants[0].name}`)
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
      description="Os times alternam como no trivia; times menores repetem participantes para manter a rotação."
      onClose={handleClose}
    >
      <div className="space-y-5 text-[var(--color-text)]">
        {/* Participante atual + próximo */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <ParticipantAvatar
              name={activeParticipant?.name ?? 'Aguardando'}
              src={activeParticipant ? participantIdentities[activeParticipant.id]?.avatarUrl : null}
              size={38}
            />
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activeTeam?.color }}
            />
            <div>
              <p className="text-sm font-semibold">
                <span data-testid="mimica-active-participant">
                  {activeParticipant?.name ?? 'Aguardando'}
                </span>
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {activeTeam?.name} · Rodada {roundNumber} · Turno {turnNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right text-xs text-[var(--color-muted)]">
            {nextParticipant ? (
              <ParticipantAvatar
                name={nextParticipant.name}
                src={participantIdentities[nextParticipant.id]?.avatarUrl}
                size={28}
              />
            ) : null}
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

        {/* Configuração e preview da ordem */}
        <details className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)] transition hover:bg-[var(--color-border)]/15">
            <span className="flex items-center gap-2">
              <UsersRound size={14} />
              Ordem ({alternateParticipants.length})
            </span>
            <span className="text-right text-[10px] font-medium normal-case tracking-normal">
              {startMode === 'continue' ? 'Do trivia' : 'Do primeiro'} ·{' '}
              {orderMode === 'alternate' ? 'Alternada' : orderMode === 'shuffle' ? 'Aleatória' : 'Por time'}
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Início</span>
                  <Tooltip content="Escolhe apenas onde a mímica começa. O turno do trivia não é alterado.">
                    <HelpCircle size={13} className="cursor-help text-[var(--color-muted)]" />
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 rounded-lg bg-[var(--color-border)]/35 p-1">
                  {([
                    { id: 'continue', label: 'Do trivia', ariaLabel: 'Continuar do trivia' },
                    { id: 'restart', label: 'Do primeiro', ariaLabel: 'Começar do primeiro' },
                  ] as const).map(option => (
                    <button
                      key={option.id}
                      type="button"
                      aria-label={option.ariaLabel}
                      onClick={() => setStartMode(option.id)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        startMode === option.id
                          ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Organização</span>
                  <Tooltip content="Alternada troca os times como no trivia. Times menores repetem participantes quando necessário.">
                    <HelpCircle size={13} className="cursor-help text-[var(--color-muted)]" />
                  </Tooltip>
                </div>
                <div className="grid grid-cols-3 rounded-lg bg-[var(--color-border)]/35 p-1">
                  {([
                    { id: 'alternate', label: 'Alternada' },
                    { id: 'shuffle', label: 'Aleatória' },
                    { id: 'team-shuffle', label: 'Por time' },
                  ] as const).map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setOrderMode(option.id)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        orderMode === option.id
                          ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {alternateParticipants.map((participant, index) => {
                const participantTeam = teams.find(team => team.id === participant.teamId)
                const isActive = index === currentParticipantIndex
                const isCompleted = index < currentParticipantIndex

                return (
                  <div
                    key={`${participant.id}-${index}`}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : isCompleted
                        ? 'border-[var(--color-border)] opacity-55'
                        : 'border-[var(--color-border)] bg-[var(--color-background)]/50'
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-border)]/50 text-[var(--color-muted)]'
                    }`}>
                      {index + 1}
                    </span>
                    <ParticipantAvatar
                      name={participant.name}
                      src={participantIdentities[participant.id]?.avatarUrl}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium text-[var(--color-text)]">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: participantTeam?.color }}
                        />
                        {participant.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted)]">{participantTeam?.name}</span>
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">Agora</span>
                    ) : null}
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
