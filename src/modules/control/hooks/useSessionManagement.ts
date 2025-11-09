import { toast } from 'sonner'
import type { TriviaTeam, TriviaParticipant } from '@/modules/trivia/types'
import type { ResetGameOptions, OnboardingConfig } from '../types/control.types'
import { generateTurnSequence } from '../utils/sessionUtils'
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
  saveCustomPin: (pin: string) => void,
  loadSession: (sessionId: string) => { teams: TriviaTeam[]; participants: TriviaParticipant[]; turnSequence: string[]; title: string; board?: Array<{ tiles: Array<unknown> }> } | null,
  setGameEndNotified: (value: boolean) => void
) {
  const loadSessionById = (sessionId: string) => {
    try {
      const loadedSession = loadSession(sessionId)
      if (loadedSession) {
        updateTeamsAndParticipants(
          loadedSession.teams,
          loadedSession.participants,
          loadedSession.turnSequence
        )

        if (loadedSession.board && loadedSession.board.length > 0) {
          toast.success('Sessão carregada com sucesso!')
        }

        toast.success(`Sessão "${loadedSession.title}" carregada!`)
      } else {
        toast.error('Erro ao carregar sessão')
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      toast.error('Erro ao carregar sessão')
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

