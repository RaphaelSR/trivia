import { toast } from 'sonner'
import type { TriviaTeam, TriviaParticipant, TriviaSession, TriviaColumn } from '@/modules/trivia/types'
import { countTotalTiles } from '@/modules/game/domain/board.utils'
import type { ResetGameOptions } from '../types/control.types'
import { buildTurnSequence } from '@/modules/game/domain/turn-order'
import { storageService } from '@/shared/services/storage.service'
import { STORAGE_KEYS } from '@/shared/constants/storage'
import type { ThemeMode } from '@/shared/types/game'
import { useTranslation } from '@/shared/i18n'

/**
 * Hook para gerenciar sessão (load, reset, onboarding)
 */
export function useSessionManagement(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  board: TriviaColumn[],
  updateTeamsAndParticipants: (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence?: string[]
  ) => void,
  removeQuestionTile: (columnId: string, tileId: string) => void,
  removeFilmColumn: (columnId: string) => void,
  setTheme: (theme: ThemeMode) => void,
  _saveCustomPin: (pin: string) => void,
  loadSession: (sessionId: string) => TriviaSession | null,
  restoreSession: (session: TriviaSession) => void,
  setGameEndNotified: (value: boolean) => void
) {
  const { t } = useTranslation('control')
  const { t: tCommon } = useTranslation('common')
  const { t: tGame } = useTranslation('game')

  const loadSessionById = (sessionId: string): boolean => {
    try {
      const loadedSession = loadSession(sessionId)
      if (loadedSession) {
        toast.info(t('dashboard.notifications.loadingSession', { title: loadedSession.title }))
        
        restoreSession(loadedSession)

        const filmsCount = loadedSession.board?.length || 0
        const questionsCount = loadedSession.board ? countTotalTiles(loadedSession.board) : 0
        const teamsCount = loadedSession.teams?.length || 0
        const totalScore = loadedSession.teams?.reduce((acc, team) => acc + (team.score || 0), 0) || 0

        const details: string[] = []
        if (filmsCount > 0) details.push(tCommon('entities.film', { count: filmsCount }))
        if (questionsCount > 0) details.push(tCommon('entities.question', { count: questionsCount }))
        if (teamsCount > 0) details.push(tCommon('entities.team', { count: teamsCount }))
        if (totalScore > 0) details.push(tCommon('entities.point', { count: totalScore }))

        const detailsText = details.length > 0 ? ` (${details.join(', ')})` : ''
        toast.success(t('dashboard.notifications.sessionLoaded', {
          title: loadedSession.title,
          details: detailsText,
        }))
        return true
      } else {
        toast.error(t('dashboard.notifications.sessionLoadError'))
        return false
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      toast.error(t('dashboard.notifications.sessionLoadError'))
      return false
    }
  }

  const resetGame = (options: ResetGameOptions) => {
    try {
      if (options.points) {
        const resetTeams = teams.map((team) => ({
          ...team,
          score: 0,
        }))
        updateTeamsAndParticipants(resetTeams, participants, undefined)
      }

      if (options.questions) {
        board.forEach((column) => {
          const tilesToRemove = [...column.tiles]
          tilesToRemove.forEach((tile) => {
            removeQuestionTile(column.id, tile.id)
          })
        })
        setGameEndNotified(false)
      }

      if (options.films) {
        const columnsToRemove = [...board]
        columnsToRemove.forEach((column) => {
          removeFilmColumn(column.id)
        })
        storageService.remove(STORAGE_KEYS.customFilms)
        setGameEndNotified(false)
      }

      if (options.themes) {
        setTheme('dark')
      }

      if (options.teams || options.participants) {
        updateTeamsAndParticipants([], [], undefined)
      }

      const resetItems: string[] = []
      if (options.points) resetItems.push(tGame('reset.options.points.title'))
      if (options.questions) resetItems.push(tGame('reset.options.questions.title'))
      if (options.films) resetItems.push(tGame('reset.options.films.title'))
      if (options.themes) resetItems.push(tGame('reset.options.themes.title'))
      if (options.teams) resetItems.push(tGame('reset.options.teams.title'))
      if (options.participants) resetItems.push(tGame('reset.options.participants.title'))

      toast.success(t('dashboard.notifications.gameReset', { items: resetItems.join(', ') }))
    } catch (error) {
      console.error('Erro ao resetar jogo:', error)
      toast.error(t('dashboard.notifications.gameResetError'))
    }
  }

  const regenerateTurnSequence = () => {
    if (teams.length === 0) {
      toast.warning(t('dashboard.notifications.noTeams'))
      return
    }

    const sortedTeams = [...teams].sort((a, b) => a.order - b.order)
    const totalQuestions = countTotalTiles(board)
    const newTurnSequence = buildTurnSequence(sortedTeams, totalQuestions)

    updateTeamsAndParticipants(teams, participants, newTurnSequence)
    toast.success(t('dashboard.notifications.turnsRegenerated'))
  }

  return {
    loadSessionById,
    resetGame,
    regenerateTurnSequence,
  }
}
