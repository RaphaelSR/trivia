import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { getNextTurnState } from '../domain/turn-order'
import { rebuildSessionTurnState } from '../domain/session'

export function useTurnManagement(
  session: TriviaSession,
  setSession: Dispatch<SetStateAction<TriviaSession>>,
) {
  const participantsById = useMemo(() => {
    const map = new Map<string, TriviaParticipant>()
    session.participants.forEach((participant) => {
      map.set(participant.id, participant)
    })
    return map
  }, [session.participants])

  const teams = useMemo(() => [...session.teams].sort((a, b) => a.order - b.order), [session.teams])

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
    const currentIndex = session.activeParticipantId ? session.turnSequence.indexOf(session.activeParticipantId) : -1
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % session.turnSequence.length
    return participantsById.get(session.turnSequence[nextIndex]) ?? null
  }, [participantsById, session.activeParticipantId, session.turnSequence])

  const nextTeam = useMemo(() => {
    if (!nextParticipant) return null
    return teams.find((team) => team.id === nextParticipant.teamId) ?? null
  }, [nextParticipant, teams])

  const advanceTurn = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      ...getNextTurnState(prev),
    }))
  }, [setSession])

  const setActiveTeam = useCallback((teamId: string) => {
    setSession((prev) => ({ ...prev, activeTeamId: teamId }))
  }, [setSession])

  const updateTeamsAndParticipants = useCallback((
    nextTeams: TriviaTeam[],
    nextParticipants: TriviaParticipant[],
    turnSequence?: string[],
  ) => {
    setSession((prev) => rebuildSessionTurnState(prev, nextTeams, nextParticipants, turnSequence))
  }, [setSession])

  return {
    teams,
    activeParticipant,
    activeTeam,
    nextParticipant,
    nextTeam,
    advanceTurn,
    setActiveTeam,
    updateTeamsAndParticipants,
  }
}
