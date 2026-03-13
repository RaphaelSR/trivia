import { toast } from 'sonner'
import type { TriviaTeam, TriviaParticipant, TriviaSession, TriviaColumn } from '@/modules/trivia/types'
import { countTotalTiles } from '@/modules/game/domain/board.utils'
import type { ResetGameOptions } from '../types/control.types'
import { buildTurnSequence } from '@/modules/game/domain/turn-order'
import { storageService } from '@/shared/services/storage.service'
import { STORAGE_KEYS } from '@/shared/constants/storage'
import type { ThemeMode } from '@/shared/types/game'

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
  const loadSessionById = (sessionId: string): boolean => {
    try {
      const loadedSession = loadSession(sessionId)
      if (loadedSession) {
        toast.info(`Carregando sessão "${loadedSession.title}"...`)
        
        restoreSession(loadedSession)

        const filmsCount = loadedSession.board?.length || 0
        const questionsCount = loadedSession.board ? countTotalTiles(loadedSession.board) : 0
        const teamsCount = loadedSession.teams?.length || 0
        const totalScore = loadedSession.teams?.reduce((acc, team) => acc + (team.score || 0), 0) || 0

        const details = []
        if (filmsCount > 0) details.push(`${filmsCount} filme${filmsCount !== 1 ? 's' : ''}`)
        if (questionsCount > 0) details.push(`${questionsCount} pergunta${questionsCount !== 1 ? 's' : ''}`)
        if (teamsCount > 0) details.push(`${teamsCount} time${teamsCount !== 1 ? 's' : ''}`)
        if (totalScore > 0) details.push(`${totalScore} pontos`)

        const detailsText = details.length > 0 ? ` (${details.join(', ')})` : ''
        toast.success(`Sessão "${loadedSession.title}" carregada!${detailsText}`)
        return true
      } else {
        toast.error('Erro ao carregar sessão')
        return false
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      toast.error('Erro ao carregar sessão')
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

      const resetItems = []
      if (options.points) resetItems.push('pontos')
      if (options.questions) resetItems.push('perguntas')
      if (options.films) resetItems.push('filmes')
      if (options.themes) resetItems.push('tema')
      if (options.teams) resetItems.push('times')
      if (options.participants) resetItems.push('participantes')

      toast.success(`Jogo resetado: ${resetItems.join(', ')}`)
    } catch (error) {
      console.error('Erro ao resetar jogo:', error)
      toast.error('Erro ao resetar o jogo')
    }
  }

  const regenerateTurnSequence = () => {
    if (teams.length === 0) {
      toast.warning('Nenhum time configurado')
      return
    }

    const sortedTeams = [...teams].sort((a, b) => a.order - b.order)
    const totalQuestions = countTotalTiles(board)
    const newTurnSequence = buildTurnSequence(sortedTeams, totalQuestions)

    updateTeamsAndParticipants(teams, participants, newTurnSequence)
    toast.success('Sequência de turnos regenerada')
  }

  return {
    loadSessionById,
    resetGame,
    regenerateTurnSequence,
  }
}
