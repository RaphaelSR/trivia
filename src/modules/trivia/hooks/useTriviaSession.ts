import { useTriviaSessionContext } from "./useTriviaSessionContext";

export function useTriviaSession() {
  const {
    session,
    teams,
    participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    advanceTurn,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    awardMimicaPoints,
    restoreSession
  } = useTriviaSessionContext();

  return {
    session,
    theme: session.theme,
    orderedTeams: teams,
    participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    advanceTurn,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    awardMimicaPoints,
    restoreSession
  };
}
