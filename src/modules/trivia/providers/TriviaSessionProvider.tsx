import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getFilmMetadata } from '../../../data/films'
import { slugify } from '../../../utils/slugify'
import { createLocalSession } from '../utils/createLocalSession'
import type {
  TriviaColumn,
  TriviaParticipant,
  TriviaQuestionTile,
  TriviaSession,
  TriviaTeam,
} from '../types'

type TriviaSessionContextValue = {
  session: TriviaSession
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeTeam: TriviaTeam | null
  nextTeam: TriviaTeam | null
  activeParticipant: TriviaParticipant | null
  nextParticipant: TriviaParticipant | null
  advanceTurn: () => void
  setActiveTeam: (teamId: string) => void
  updateTileState: (tileId: string, state: TriviaQuestionTile['state']) => void
  updateTileContent: (tileId: string, updates: Partial<Pick<TriviaQuestionTile, 'question' | 'answer' | 'points'>>) => void
  updateColumnTitle: (columnId: string, film: string) => void
  addFilmColumn: (displayName?: string) => string
  removeFilmColumn: (columnId: string) => void
  addQuestionTile: (columnId: string, defaults?: Partial<TriviaQuestionTile>) => string
  removeQuestionTile: (columnId: string, tileId: string) => void
  updateTeamsAndParticipants: (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence: string[],
  ) => void
}

const TriviaSessionContext = createContext<TriviaSessionContextValue | null>(null)

type TriviaSessionProviderProps = {
  children: ReactNode
}

export function TriviaSessionProvider({ children }: TriviaSessionProviderProps) {
  const [session, setSession] = useState<TriviaSession>(() => createLocalSession())

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
    }
  }, [
    activeParticipant,
    activeTeam,
    nextParticipant,
    nextTeam,
    session,
    teams,
  ])

  return <TriviaSessionContext.Provider value={value}>{children}</TriviaSessionContext.Provider>
}

export function useTriviaSessionContext(): TriviaSessionContextValue {
  const context = useContext(TriviaSessionContext)
  if (!context) {
    throw new Error('useTriviaSessionContext must be used within TriviaSessionProvider')
  }
  return context
}
