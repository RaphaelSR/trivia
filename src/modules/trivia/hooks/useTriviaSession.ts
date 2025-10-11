import { useMemo } from "react";
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
    awardPoints
  } = useTriviaSessionContext();

  const orderedTeams = useMemo(() => teams, [teams]);

  return {
    session,
    theme: session.theme,
    orderedTeams,
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
    awardPoints
  };
}
