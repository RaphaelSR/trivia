import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getFilmMetadata } from '../../../data/films'
import { slugify } from '../../../utils/slugify'
import { createLocalSession } from '../utils/createLocalSession'
import { createEmptySession } from '../utils/createEmptySession'
import { useGameMode } from '../../../hooks/useGameMode'
import type {
  TriviaColumn,
  TriviaParticipant,
  TriviaQuestionTile,
  TriviaSession,
  TriviaTeam,
} from '../types'
import { TriviaSessionContext } from '../context/TriviaSessionContext'

type TriviaSessionProviderProps = {
  children: ReactNode
}

export function TriviaSessionProvider({ children }: TriviaSessionProviderProps) {
  const { gameMode } = useGameMode()
  
  const [session, setSession] = useState<TriviaSession>(() => {
    // Inicializa sessão baseada no modo de jogo
    switch (gameMode) {
      case 'demo':
        return createLocalSession()
      case 'offline':
        // Tenta carregar sessão salva do localStorage
        try {
          const savedSession = localStorage.getItem('trivia-active-session')
          if (savedSession) {
            const parsed = JSON.parse(savedSession)
            return parsed.session || createEmptySession()
          }
        } catch (error) {
          console.error('Erro ao carregar sessão offline:', error)
        }
        return createEmptySession()
      case 'online':
        // Por enquanto usa sessão local, será implementado com Firebase
        return createLocalSession()
      default:
        return createLocalSession()
    }
  })

  // Reinicializa sessão quando o modo de jogo mudar
  useEffect(() => {
    const newSession = (() => {
      switch (gameMode) {
        case 'demo':
          return createLocalSession()
        case 'offline':
          // Tenta carregar sessão salva do localStorage
          try {
            const savedSession = localStorage.getItem('trivia-active-session')
            if (savedSession) {
              const parsed = JSON.parse(savedSession)
              console.log('[TriviaSessionProvider] Sessão restaurada:', parsed.metadata?.name)
              return parsed.session || createEmptySession()
            }
          } catch (error) {
            console.error('Erro ao carregar sessão offline:', error)
          }
          return createEmptySession()
        case 'online':
          // Por enquanto usa sessão local, será implementado com Firebase
          return createLocalSession()
        default:
          return createLocalSession()
      }
    })()
    
    setSession(newSession)
  }, [gameMode])

  const participantsById = useMemo(() => {
    const map = new Map<string, TriviaParticipant>()
    session.participants.forEach((participant) => {
      map.set(participant.id, participant)
    })
    return map
  }, [session.participants])

  const teams = useMemo(() => {
    return [...session.teams].sort((a, b) => a.order - b.order)
  }, [session.teams])

  const activeParticipant = useMemo(() => {
    if (!session.activeParticipantId) return null
    return participantsById.get(session.activeParticipantId) ?? null
  }, [participantsById, session.activeParticipantId])

  const activeTeam = useMemo(() => {
    if (!session.activeTeamId) return teams[0] ?? null
    return teams.find((team) => team.id === session.activeTeamId) ?? teams[0] ?? null
  }, [session.activeTeamId, teams])

  const nextParticipant = useMemo(() => {
    if (!session.turnSequence.length) return null
    const sequence = session.turnSequence
    const currentIndex = session.activeParticipantId
      ? sequence.indexOf(session.activeParticipantId)
      : -1
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length
    return participantsById.get(sequence[nextIndex]) ?? null
  }, [participantsById, session.activeParticipantId, session.turnSequence])

  const nextTeam = useMemo(() => {
    if (!nextParticipant) return null
    return teams.find((team) => team.id === nextParticipant.teamId) ?? null
  }, [nextParticipant, teams])

  const advanceTurn = () => {
    setSession((prev) => {
      if (!prev.turnSequence.length) {
        return prev
      }
      const currentIndex = prev.activeParticipantId
        ? prev.turnSequence.indexOf(prev.activeParticipantId)
        : -1
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % prev.turnSequence.length
      const nextParticipantId = prev.turnSequence[nextIndex]
      const participant = prev.participants.find((p) => p.id === nextParticipantId)
      const nextTeamId = participant?.teamId ?? prev.activeTeamId
      return {
        ...prev,
        activeParticipantId: nextParticipantId ?? null,
        activeTeamId: nextTeamId ?? prev.activeTeamId,
      }
    })
  }

  const setActiveTeam = (teamId: string) => {
    setSession((prev) => ({ ...prev, activeTeamId: teamId }))
  }

  const updateTileState = (tileId: string, state: TriviaQuestionTile['state']) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => ({
        ...column,
        tiles: column.tiles.map((tile) =>
          tile.id === tileId
            ? {
                ...tile,
                state,
              }
            : tile,
        ),
      })),
    }))
  }

  const updateTileContent = (
    tileId: string,
    updates: Partial<Pick<TriviaQuestionTile, 'question' | 'answer' | 'points'>>,
  ) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => ({
        ...column,
        tiles: column.tiles.map((tile) =>
          tile.id === tileId
            ? {
                ...tile,
                ...updates,
              }
            : tile,
        ),
      })),
    }))
  }

  const updateColumnTitle = (columnId: string, film: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) =>
        column.id === columnId
          ? {
              ...column,
              film,
            }
          : column,
      ),
    }))
  }

  const addFilmColumn = (displayName = 'Novo Filme') => {
    const metadata = getFilmMetadata(displayName)
    const columnId = `${slugify(displayName)}-${Date.now()}`
    const newColumn: TriviaColumn = {
      id: columnId,
      filmId: metadata.id,
      film: displayName,
      theme: metadata.theme,
      tiles: [],
    }
    setSession((prev) => ({
      ...prev,
      board: [...prev.board, newColumn],
    }))
    return columnId
  }

  const removeFilmColumn = (columnId: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.filter((column) => column.id !== columnId),
    }))
  }

  const addQuestionTile = (
    columnId: string,
    defaults: Partial<TriviaQuestionTile> = {},
  ) => {
    const tileId = `${columnId}-tile-${Date.now()}`
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) => {
        if (column.id !== columnId) return column
        const metadata = column.theme ?? getFilmMetadata(column.film).theme
        const newTile: TriviaQuestionTile = {
          id: tileId,
          film: column.film,
          points: defaults.points ?? 10,
          question: defaults.question ?? 'Nova pergunta',
          answer: defaults.answer ?? '',
          state: 'available',
        }
        return {
          ...column,
          theme: column.theme ?? metadata,
          tiles: [...column.tiles, newTile],
        }
      }),
    }))
    return tileId
  }

  const removeQuestionTile = (columnId: string, tileId: string) => {
    setSession((prev) => ({
      ...prev,
      board: prev.board.map((column) =>
        column.id === columnId
          ? {
              ...column,
              tiles: column.tiles.filter((tile) => tile.id !== tileId),
            }
          : column,
      ),
    }))
  }

  const updateTeamsAndParticipants = (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence: string[],
  ) => {
    setSession((prev) => {
      const sanitizedTurnSequence = turnSequence.filter((id) =>
        participants.some((participant) => participant.id === id),
      )
      const activeParticipantId = sanitizedTurnSequence[0] ?? null
      const activeParticipant = participants.find((participant) => participant.id === activeParticipantId)
      const activeTeamId = activeParticipant?.teamId ?? teams[0]?.id ?? prev.activeTeamId
      return {
        ...prev,
        teams,
        participants,
        turnSequence: sanitizedTurnSequence,
        activeParticipantId,
        activeTeamId,
      }
    })
  }

  const awardPoints = useCallback((tileId: string, teamId: string, participantId: string, pointsAwarded: number) => {
    setSession((prev) => {
      // Atualiza a pontuação do time
      const updatedTeams = prev.teams.map((team) => 
        team.id === teamId 
          ? { ...team, score: (team.score || 0) + pointsAwarded }
          : team
      )

      // Marca a pergunta como respondida
      const updatedBoard = prev.board.map((column) => ({
        ...column,
        tiles: column.tiles.map((tile) =>
          tile.id === tileId
            ? {
                ...tile,
                state: 'answered' as const,
                answeredBy: {
                  participantId,
                  teamId,
                  pointsAwarded,
                  timestamp: new Date().toISOString(),
                },
              }
            : tile
        ),
      }))

      return {
        ...prev,
        teams: updatedTeams,
        board: updatedBoard,
      }
    })
  }, [])

  const value = useMemo(() => {
    return {
      session,
      teams,
      participants: session.participants,
      activeTeam,
      nextTeam,
      activeParticipant,
      nextParticipant,
      advanceTurn,
      setActiveTeam,
      updateTileState,
      updateTileContent,
      updateColumnTitle,
      addFilmColumn,
      removeFilmColumn,
      addQuestionTile,
      removeQuestionTile,
      updateTeamsAndParticipants,
      awardPoints,
    }
  }, [
    activeParticipant,
    activeTeam,
    nextParticipant,
    nextTeam,
    session,
    teams,
    awardPoints,
  ])

  return <TriviaSessionContext.Provider value={value}>{children}</TriviaSessionContext.Provider>
}

