import { toast } from 'sonner'
import type { TriviaTeam, TriviaParticipant, TriviaSession } from '@/modules/trivia/types'
import type { ResetGameOptions } from '../types/control.types'
import { createAlternatingTurnSequence } from '@/modules/trivia/utils/createAlternatingTurnSequence'
import { createBalancedTurnSequence } from '@/modules/trivia/utils/createBalancedTurnSequence'

/**
 * Hook para gerenciar sessão (load, reset, onboarding)
 */
export function useSessionManagement(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  board: Array<{ tiles: Array<unknown> }>,
  updateTeamsAndParticipants: (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence?: string[]
  ) => void,
  removeQuestionTile: (columnId: string, tileId: string) => void,
  removeFilmColumn: (columnId: string) => void,
  setTheme: (theme: 'light' | 'dark' | 'brazil') => void,
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
        const questionsCount = loadedSession.board?.reduce((acc, column) => acc + column.tiles.length, 0) || 0
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
                  const tilesToRemove = [...(column.tiles as Array<{ id: string }>)]
                  tilesToRemove.forEach((tile) => {
                    removeQuestionTile((column as unknown as { id: string }).id, tile.id)
                  })
                })
                setGameEndNotified(false)
              }

              if (options.films) {
                const columnsToRemove = [...board]
                columnsToRemove.forEach((column) => {
                  removeFilmColumn((column as unknown as { id: string }).id)
                })
        localStorage.removeItem('trivia-custom-films')
        setGameEndNotified(false)
      }

      if (options.themes) {
        setTheme('light')
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
    const totalQuestions = board.reduce((acc, column) => acc + column.tiles.length, 0)
    const newTurnSequence = totalQuestions > 0
      ? createBalancedTurnSequence(sortedTeams, totalQuestions)
      : createAlternatingTurnSequence(sortedTeams)

    updateTeamsAndParticipants(teams, participants, newTurnSequence)
    toast.success('Sequência de turnos regenerada')
  }

  return {
    loadSessionById,
    resetGame,
    regenerateTurnSequence,
  }
}

