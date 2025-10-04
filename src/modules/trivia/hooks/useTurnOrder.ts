import { useTriviaSessionContext } from '../providers/TriviaSessionProvider'

export function useTurnOrder() {
  const { teams, activeTeam, nextTeam, advanceTurn, setActiveTeam } = useTriviaSessionContext()

  return {
    teams,
    activeTeam,
    nextTeam,
    advanceTurn,
    setActiveTeam,
  }
}
