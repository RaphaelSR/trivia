import { useMemo } from 'react'
import { useTriviaSessionContext } from '../providers/TriviaSessionProvider'

export function useTriviaSession() {
  const {
    session,
    teams,
    participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
  } = useTriviaSessionContext()

  const orderedTeams = useMemo(() => teams, [teams])

  return {
    session,
    theme: session.theme,
    orderedTeams,
    participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
  }
}
