import { useState, useMemo } from 'react'
import { Calendar, Film, UsersRound } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { TriviaParticipant, TriviaTeam, TriviaColumn, MimicaScore } from '@/modules/trivia/types'
import { useTranslation } from '@/shared/i18n'

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
  allTeams,
}: ScoreDetailViewProps) {
  const { t, i18n } = useTranslation(['game', 'common'])
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
    return date.toLocaleTimeString(i18n.resolvedLanguage ?? i18n.language, { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      title={t('scoreDetail.title', { ns: 'game', name: participant.name })}
      description={t('scoreDetail.description', { ns: 'game', team: team.name, points: totalPoints })}
      onClose={onClose}
    >
      <div className="space-y-4 text-[var(--color-text)]">
        <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'summary'
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t('scoreDetail.summary', { ns: 'game' })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trivia')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'trivia'
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t('scoreDetail.trivia', { ns: 'game' })} ({triviaScores.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mimica')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'mimica'
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t('scoreDetail.mimica', { ns: 'game' })} ({participantMimicaScores.length})
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{t('scoreDetail.totalPoints', { ns: 'game' })}</h3>
                <div className="text-3xl font-bold text-[var(--color-primary)]">{totalPoints}</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                  <div className="flex items-center gap-2">
                    <Film size={16} className="text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">{t('scoreDetail.triviaQuestions', { ns: 'game' })}</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-primary)]">{t('entities.point', { ns: 'common', count: totalTriviaPoints })}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
                  <div className="flex items-center gap-2">
                    <UsersRound size={16} className="text-[var(--color-secondary)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">{t('scoreDetail.mimicas', { ns: 'game' })}</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-secondary)]">{t('entities.point', { ns: 'common', count: totalMimicaPoints })}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] mb-3">
                {t('scoreDetail.statistics', { ns: 'game' })}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--color-muted)]">{t('scoreDetail.answeredQuestions', { ns: 'game' })}</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{triviaScores.length}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">{t('scoreDetail.correctMimicas', { ns: 'game' })}</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">{participantMimicaScores.length}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">{t('scoreDetail.averageQuestion', { ns: 'game' })}</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">
                    {t('entities.point', { ns: 'common', count: triviaScores.length > 0 ? Math.round(totalTriviaPoints / triviaScores.length) : 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted)]">{t('scoreDetail.averageMimica', { ns: 'game' })}</p>
                  <p className="text-lg font-bold text-[var(--color-text)]">
                    {t('entities.point', { ns: 'common', count: participantMimicaScores.length > 0 ? Math.round(totalMimicaPoints / participantMimicaScores.length) : 0 })}
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
                {t('scoreDetail.triviaQuestions', { ns: 'game' })}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'turn')}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text)]"
                >
                  <option value="date">{t('scoreDetail.sortDate', { ns: 'game' })}</option>
                  <option value="points">{t('scoreDetail.sortPoints', { ns: 'game' })}</option>
                  <option value="turn">{t('scoreDetail.sortTurn', { ns: 'game' })}</option>
                </select>
              </div>
            </div>
            {triviaScores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">{t('scoreDetail.noQuestion', { ns: 'game' })}</p>
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
                              {t('scoreDetail.trivia', { ns: 'game' })}
                            </span>
                            <span className="text-xs font-medium text-[var(--color-muted)]">{score.film}</span>
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text)] mb-1">{score.question}</p>
                          {score.answer && (
                            <p className="text-xs text-[var(--color-muted)] italic">{t('scoreDetail.answer', { ns: 'game', answer: score.answer })}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[var(--color-primary)]">{t('entities.point', { ns: 'common', count: score.points })}</div>
                          <div className="text-xs text-[var(--color-muted)] flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(score.timestamp)}
                          </div>
                          {score.turnNumber !== undefined && (
                            <div className="text-xs text-[var(--color-muted)]">
                              {score.roundNumber !== undefined
                                ? t('scoreDetail.turnRound', { ns: 'game', turn: score.turnNumber, round: score.roundNumber })
                                : t('scoreDetail.turn', { ns: 'game', turn: score.turnNumber })}
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
                {t('scoreDetail.mimicas', { ns: 'game' })}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'turn')}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text)]"
                >
                  <option value="date">{t('scoreDetail.sortDate', { ns: 'game' })}</option>
                  <option value="points">{t('scoreDetail.sortPoints', { ns: 'game' })}</option>
                  <option value="turn">{t('scoreDetail.sortTurn', { ns: 'game' })}</option>
                </select>
              </div>
            </div>
            {participantMimicaScores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">{t('scoreDetail.noMimica', { ns: 'game' })}</p>
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
                        ? t('scoreDetail.modes.full', { ns: 'game' })
                        : score.mode === 'half-current'
                        ? t('scoreDetail.modes.half', { ns: 'game' })
                        : score.mode === 'steal'
                        ? t('scoreDetail.modes.steal', { ns: 'game' })
                        : score.mode === 'everyone'
                        ? t('scoreDetail.modes.everyone', { ns: 'game' })
                        : t('scoreDetail.modes.void', { ns: 'game' })

                    return (
                      <div
                        key={score.id}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 hover:border-[var(--color-secondary)]/50 hover:bg-[color-mix(in_srgb,var(--color-secondary)_5%,var(--color-background)_95%)] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-2 py-1 rounded-full">
                                {t('scoreDetail.mimica', { ns: 'game' })}
                              </span>
                              <span className="text-xs font-medium text-[var(--color-muted)]">{modeLabel}</span>
                              {targetTeam && (
                                <span className="text-xs font-medium text-[var(--color-muted)]">
                                  → {targetTeam.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {t('scoreDetail.roundTurn', { ns: 'game', round: score.roundNumber, turn: score.turnNumber })}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-[var(--color-secondary)]">{t('entities.point', { ns: 'common', count: score.pointsAwarded })}</div>
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
            {t('actions.close', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
