import { useTriviaSessionContext } from "./useTriviaSessionContext";

export function useTurnOrder() {
  const { teams, activeTeam, nextTeam, advanceTurn, setActiveTeam } =
    useTriviaSessionContext();

  return {
    teams,
    activeTeam,
    nextTeam,
    advanceTurn,
    setActiveTeam
  };
}
