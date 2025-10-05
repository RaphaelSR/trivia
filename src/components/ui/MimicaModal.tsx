import { UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './Button'
import { Modal } from './Modal'
import { Timer } from './Timer'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'

type MimicaModalProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeParticipant: TriviaParticipant | null
  turnSequence: string[]
  onAdvanceTurn: () => void
  onScore: (mode: ScoringMode, targetTeamId?: string, points?: number) => void
}

type ScoringMode = 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void'

/**
 * Modal para modo mímica com lista de participantes alternada
 * @param isOpen - Estado de abertura do modal
 * @param onClose - Função para fechar o modal
 * @param teams - Lista de times
 * @param participants - Lista de participantes
 * @param activeParticipant - Participante ativo atual
 * @param onAdvanceTurn - Função para avançar turno
 * @param onScore - Função para pontuar
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

  // Função para embaralhar array (Fisher-Yates)
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Gerar sequência baseada no modo escolhido
  useEffect(() => {
    if (isOpen && turnSequence.length > 0) {
      let newSequence: string[] = []
      
      switch (shuffleMode) {
        case 'alternate': {
          // Ordem alternada: 1 de cada time por vez
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
          // Embaralhamento completo
          newSequence = shuffleArray(turnSequence)
          break
          
        case 'team-shuffle': {
          // Embaralhar dentro de cada time, mas manter alternância
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
    
    onScore(mode, targetTeamId, points)
    setScoringMode(null)
    setSelectedTeam(null)
    
    // Avançar automaticamente para próxima pessoa
    setTimeout(() => {
      // Se ainda há participantes na sequência embaralhada, avança
      if (currentParticipantIndex < alternateParticipants.length - 1) {
        onAdvanceTurn()
        if (nextParticipant) {
          toast.success(`Próximo turno: ${nextParticipant.name}`)
        }
      } else {
        // Fim da mímica
        toast.success('Mímica finalizada! Todos participaram.')
        onClose()
      }
    }, 500) // Pequeno delay para mostrar o feedback
  }

  const scoringOptions: Array<{ id: ScoringMode; title: string; subtitle: string; points: number }> = [
    { id: 'full-current', title: 'Valor cheio', subtitle: 'Time da vez recebe 100%', points: mimicaPoints },
    { id: 'half-current', title: 'Meio valor', subtitle: 'Time da vez recebe 50%', points: Math.round(mimicaPoints / 2) },
    { id: 'steal', title: 'Roubo', subtitle: 'Transferir para outro time', points: mimicaPoints },
    { id: 'everyone', title: 'Todos', subtitle: 'Distribuir para todas as equipes', points: Math.round(mimicaPoints / teams.length) },
    { id: 'void', title: 'Anular', subtitle: 'Mímica sem pontuação', points: 0 },
  ]

  const canConfirm = scoringMode !== null && (scoringMode !== 'steal' || (scoringMode === 'steal' && selectedTeam !== null))

  return (
    <Modal
      isOpen={isOpen}
      title="Modo Mímica"
      description="Momento de mímica! Cada participante faz sua vez na ordem alternada."
      onClose={handleClose}
    >
      <div className="space-y-6 text-[var(--color-text)]">
        <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UsersRound size={16} className="text-[var(--color-primary)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {activeParticipant?.name ?? 'Aguardando início'}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {activeTeam?.name ?? 'Time não definido'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted)]">Próximo:</p>
              <p className="text-xs font-medium text-[var(--color-text)]">
                {nextParticipant?.name ?? 'Fim'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              Configuração da mímica
              <span className="text-xs text-[var(--color-muted)]">Clique para expandir</span>
            </summary>
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                  Valor 100%:
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={mimicaPoints}
                    onChange={(event) => setMimicaPoints(Number(event.target.value))}
                    className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-center text-sm"
                  />
                  pts
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Ordem de participação:
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'alternate', label: 'Alternada', description: '1 de cada time por vez' },
                    { id: 'shuffle', label: 'Embaralhada', description: 'Ordem completamente aleatória' },
                    { id: 'team-shuffle', label: 'Por time', description: 'Embaralha dentro de cada time' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="shuffleMode"
                        value={option.id}
                        checked={shuffleMode === option.id}
                        onChange={(e) => setShuffleMode(e.target.value as 'alternate' | 'shuffle' | 'team-shuffle')}
                        className="text-[var(--color-primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[var(--color-text)]">{option.label}</span>
                        <p className="text-xs text-[var(--color-muted)]">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>
          
          <Timer
            initialSeconds={60}
            variant="compact"
            editable
          />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Ordem de Participação
            </h3>
            <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-full">
              {shuffleMode === 'alternate' ? '🔄 Alternada' : 
               shuffleMode === 'shuffle' ? '🎲 Embaralhada' : 
               '👥 Por time'}
            </span>
          </div>
          <div className="space-y-2">
            {alternateParticipants.map((participant, index) => {
              const participantTeam = teams.find(team => team.id === participant.teamId)
              const isActive = participant.id === activeParticipant?.id
              const isCompleted = index < currentParticipantIndex
              
              return (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]'
                      : isCompleted
                      ? 'bg-[var(--color-muted)]/10 text-[var(--color-muted)]'
                      : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                    }`}>
                      {index + 1}º
                    </span>
                    <span className="text-sm font-medium">{participant.name}</span>
                  </div>
                  <span className="text-xs text-[var(--color-muted)]">
                    {participantTeam?.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              Distribuição de pontos
              <span className="text-xs text-[var(--color-muted)]">Selecione uma opção</span>
            </summary>
            <div className="space-y-2 px-4 pb-4">
              {scoringOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setScoringMode(option.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    scoringMode === option.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">{option.title}</span>
                      <p className="text-xs text-[var(--color-muted)]">{option.subtitle}</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {option.points} pts
                    </span>
                  </div>
                </button>
              ))}
              {scoringMode === 'steal' ? (
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                  Selecionar time
                  <select
                    value={selectedTeam ?? ''}
                    onChange={(event) => setSelectedTeam(event.target.value)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                  >
                    {stealTargets.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </details>
          
          <Button
            variant={scoringMode ? 'secondary' : 'outline'}
            disabled={!canConfirm}
            onClick={() => handleScore(scoringMode ?? 'full-current', scoringMode === 'steal' ? selectedTeam ?? undefined : undefined)}
            className="w-full"
          >
            Confirmar pontuação e avançar
          </Button>
        </div>

        <Button variant="outline" onClick={handleClose} className="w-full">
          Fechar mímica
        </Button>
      </div>
    </Modal>
  )
}
