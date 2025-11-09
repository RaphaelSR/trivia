import { useState, useMemo } from 'react'
import { Calendar, Film, UsersRound } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { TriviaParticipant, TriviaTeam, TriviaColumn, MimicaScore } from '@/modules/trivia/types'

type ScoreDetailViewProps = {
  isOpen: boolean
  onClose: () => void
  participant: TriviaParticipant
  team: TriviaTeam
  board: TriviaColumn[]
  mimicaScores: MimicaScore[]
  allParticipants: TriviaParticipant[]
  allTeams: TriviaTeam[]
}

type TabType = 'summary' | 'trivia' | 'mimica'

/**
 * Componente para exibir detalhes completos de score individual
 */
export function ScoreDetailView({
  isOpen,
  onClose,
  participant,
  team,
  board,
  mimicaScores,
  allParticipants: _allParticipants,
  allTeams,
}: ScoreDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [sortBy, setSortBy] = useState<'date' | 'points' | 'turn'>('date')

  const triviaScores = useMemo(() => {
    return board
      .flatMap((column) =>
        column.tiles
          .filter((tile) => tile.answeredBy?.participantId === participant.id)
          .map((tile) => ({
            id: tile.id,
            film: column.film,
            question: tile.question,
            answer: tile.answer,
            points: tile.answeredBy?.pointsAwarded || 0,
            timestamp: tile.answeredBy?.timestamp || '',
            turnNumber: tile.answeredBy?.turnNumber,
            roundNumber: tile.answeredBy?.roundNumber,
            source: 'trivia' as const,
          }))
      )
      .filter((score) => score.points > 0)
  }, [board, participant.id])

  const participantMimicaScores = useMemo(() => {
    return mimicaScores.filter((score) => score.participantId === participant.id)
  }, [mimicaScores, participant.id])

  const totalTriviaPoints = useMemo(() => {
    return triviaScores.reduce((sum, score) => sum + score.points, 0)
  }, [triviaScores])

  const totalMimicaPoints = useMemo(() => {
    return participantMimicaScores.reduce((sum, score) => sum + score.pointsAwarded, 0)
  }, [participantMimicaScores])

  const totalPoints = totalTriviaPoints + totalMimicaPoints

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      title={`Detalhes de ${participant.name}`}
      description={`${team.name} · ${totalPoints} pontos totais`}
      onClose={onClose}
    >
      <div className="space-y-4 text-[var(--color-text)]">
        <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'summary'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Resumo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trivia')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'trivia'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Trivia ({triviaScores.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mimica')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'mimica'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Mímica ({participantMimicaScores.length})
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">Total de Pontos</h3>
                <div className="text-3xl font-bold text-[var(--color-primary)]">{totalPoints}</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                  <div className="flex items-center gap-2">
                    <Film size={16} className="text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">Perguntas do Trivia</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-primary)]">{totalTriviaPoints} pts</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
                  <div className="flex items-center gap-2">
                    <UsersRound size={16} className="text-[var(--color-secondary)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">Mímicas</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-secondary)]">{totalMimicaPoints} pts</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] mb-3">
                Estatísticas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Perguntas respondidas</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{triviaScores.length}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Mímicas acertadas</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{participantMimicaScores.length}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Média por pergunta</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">
                    {triviaScores.length > 0 ? Math.round(totalTriviaPoints / triviaScores.length) : 0} pts
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">Média por mímica</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">
                    {participantMimicaScores.length > 0 ? Math.round(totalMimicaPoints / participantMimicaScores.length) : 0} pts
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trivia' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                Perguntas do Trivia
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'turn')}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text)]"
                >
                  <option value="date">Por data</option>
                  <option value="points">Por pontos</option>
                  <option value="turn">Por turno</option>
                </select>
              </div>
            </div>
            {triviaScores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">Nenhuma pergunta respondida ainda</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {triviaScores
                  .sort((a, b) => {
                    switch (sortBy) {
                      case 'points':
                        return b.points - a.points
                      case 'turn':
                        if (a.roundNumber !== undefined && b.roundNumber !== undefined) {
                          if (a.roundNumber !== b.roundNumber) {
                            return a.roundNumber - b.roundNumber
                          }
                          return (a.turnNumber || 0) - (b.turnNumber || 0)
                        }
                        return 0
                      case 'date':
                      default:
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    }
                  })
                  .map((score) => (
                    <div
                      key={score.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 hover:border-[var(--color-primary)]/50 hover:bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-background)_95%)] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-full">
                              Trivia
                            </span>
                            <span className="text-xs font-medium text-[var(--color-muted)]">{score.film}</span>
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text)] mb-1">{score.question}</p>
                          {score.answer && (
                            <p className="text-xs text-[var(--color-muted)] italic">R: {score.answer}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[var(--color-primary)]">{score.points} pts</div>
                          <div className="text-xs text-[var(--color-muted)] flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(score.timestamp)}
                          </div>
                          {score.turnNumber !== undefined && (
                            <div className="text-xs text-[var(--color-muted)]">
                              Turno {score.turnNumber}
                              {score.roundNumber !== undefined && ` (Volta ${score.roundNumber})`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mimica' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                Mímicas
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'turn')}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text)]"
                >
                  <option value="date">Por data</option>
                  <option value="points">Por pontos</option>
                  <option value="turn">Por turno</option>
                </select>
              </div>
            </div>
            {participantMimicaScores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">Nenhuma mímica acertada ainda</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participantMimicaScores
                  .sort((a, b) => {
                    switch (sortBy) {
                      case 'points':
                        return b.pointsAwarded - a.pointsAwarded
                      case 'turn':
                        if (a.roundNumber !== b.roundNumber) {
                          return a.roundNumber - b.roundNumber
                        }
                        return a.turnNumber - b.turnNumber
                      case 'date':
                      default:
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    }
                  })
                  .map((score) => {
                    const targetTeam = score.targetTeamId
                      ? allTeams.find((t) => t.id === score.targetTeamId)
                      : null
                    const modeLabel =
                      score.mode === 'full-current'
                        ? 'Valor cheio'
                        : score.mode === 'half-current'
                        ? 'Meio valor'
                        : score.mode === 'steal'
                        ? 'Roubo'
                        : score.mode === 'everyone'
                        ? 'Todos'
                        : 'Anulada'

                    return (
                      <div
                        key={score.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 hover:border-[var(--color-secondary)]/50 hover:bg-[color-mix(in_srgb,var(--color-secondary)_5%,var(--color-background)_95%)] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-2 py-1 rounded-full">
                                Mímica
                              </span>
                              <span className="text-xs font-medium text-[var(--color-muted)]">{modeLabel}</span>
                              {targetTeam && (
                                <span className="text-xs font-medium text-[var(--color-muted)]">
                                  → {targetTeam.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              Volta {score.roundNumber} · Turno {score.turnNumber}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-[var(--color-secondary)]">{score.pointsAwarded} pts</div>
                            <div className="text-xs text-[var(--color-muted)] flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(score.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

