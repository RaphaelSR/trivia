import { createAlternatingTurnSequence } from '../../trivia/utils/createAlternatingTurnSequence'
import { createBalancedTurnSequence } from '../../trivia/utils/createBalancedTurnSequence'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '../../trivia/types'
import { countTotalTiles } from './board.utils'

export type TurnPreviewEntry = {
  turnNumber: number
  participantId: string
  participantName: string
  teamId: string
  teamName: string
  teamColor: string
  repeatedInGroup: boolean
}

export type TurnPreviewGroup = {
  number: number
  label: string
  isPartial: boolean
  entries: TurnPreviewEntry[]
}

export function buildTurnSequence(teams: TriviaTeam[], totalQuestions: number): string[] {
  if (totalQuestions > 0) {
    return createBalancedTurnSequence(teams, totalQuestions)
  }

  return createAlternatingTurnSequence(teams)
}

export function getCompleteRoundNumber(
  activeParticipantId: string | null,
  turnSequence: string[],
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  activeTurnIndex?: number,
): number {
  const currentIndex = resolveTurnIndex(activeTurnIndex, activeParticipantId, turnSequence)
  if (currentIndex === -1) {
    return 1
  }

  const groups = groupCompleteRounds(turnSequence.slice(0, currentIndex + 1), teams, participants)
  return groups.length || 1
}

export function getCompleteRoundLabel(
  activeParticipantId: string | null,
  turnSequence: string[],
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  activeTurnIndex?: number,
): string {
  const roundNumber = getCompleteRoundNumber(
    activeParticipantId,
    turnSequence,
    teams,
    participants,
    activeTurnIndex,
  )

  return `Rodada ${roundNumber}`
}

export function getTurnLabel(
  activeParticipantId: string | null,
  turnSequence: string[],
  activeTurnIndex?: number,
): string {
  const currentTurnIndex = resolveTurnIndex(activeTurnIndex, activeParticipantId, turnSequence)

  if (currentTurnIndex === -1) {
    return 'Aguardando sequência'
  }

  return `${currentTurnIndex + 1} de ${turnSequence.length}`
}

export function getRecommendedPreviewTurnCount(
  teams: TriviaTeam[],
  groupCount = 2,
): number {
  if (!teams.length) {
    return 0
  }

  const maxMembers = Math.max(...teams.map((team) => team.members.length), 0)
  return teams.length * Math.max(maxMembers, 1) * Math.max(groupCount, 1)
}

export function buildTurnPreviewGroups(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  totalTurns: number,
  maxGroups?: number,
): TurnPreviewGroup[] {
  if (!teams.length || !participants.length || totalTurns <= 0) {
    return []
  }

  const sortedTeams = [...teams].sort((a, b) => a.order - b.order)
  const sequence = buildTurnSequence(sortedTeams, totalTurns)
  const grouped = groupCompleteRounds(sequence, sortedTeams, participants)

  return typeof maxGroups === 'number' ? grouped.slice(0, maxGroups) : grouped
}

export function getNextTurnState(session: TriviaSession): {
  turnSequence: string[]
  activeParticipantId: string | null
  activeTurnIndex: number
  activeTeamId: string
} {
  const sequence = session.turnSequence

  if (!sequence.length) {
    return {
      turnSequence: sequence,
      activeParticipantId: session.activeParticipantId,
      activeTurnIndex: 0,
      activeTeamId: session.activeTeamId,
    }
  }

  const currentIndex = resolveTurnIndex(session.activeTurnIndex, session.activeParticipantId, sequence)
  const isWrappingAround = currentIndex === sequence.length - 1
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sequence.length

  let nextSequence = sequence
  let nextTurnIndex = nextIndex
  let nextParticipantId = sequence[nextIndex] ?? null

  if (isWrappingAround && session.teams.length > 1) {
    const sortedTeams = [...session.teams].sort((a, b) => a.order - b.order)
    const totalQuestions = countTotalTiles(session.board)
    const regeneratedSequence = buildTurnSequence(sortedTeams, totalQuestions)

    if (regeneratedSequence.length > sequence.length) {
      nextSequence = regeneratedSequence
      nextTurnIndex = Math.min(sequence.length, regeneratedSequence.length - 1)
      nextParticipantId = nextSequence[nextTurnIndex] ?? nextParticipantId
    } else {
      const lastParticipant = session.participants.find(
        (participant) => participant.id === sequence[sequence.length - 1],
      )
      nextSequence = rotateAwayFromTeam(regeneratedSequence, session.participants, lastParticipant?.teamId)
      nextTurnIndex = 0
      nextParticipantId = nextSequence[nextTurnIndex] ?? nextParticipantId
    }
  }

  const nextParticipant = session.participants.find((participant) => participant.id === nextParticipantId)

  return {
    turnSequence: nextSequence,
    activeParticipantId: nextParticipantId,
    activeTurnIndex: nextTurnIndex,
    activeTeamId: nextParticipant?.teamId ?? session.activeTeamId,
  }
}

export function resolveTurnIndex(
  activeTurnIndex: number | undefined,
  activeParticipantId: string | null,
  turnSequence: string[],
): number {
  if (turnSequence.length === 0) {
    return -1
  }

  if (
    activeTurnIndex !== undefined &&
    activeTurnIndex >= 0 &&
    activeTurnIndex < turnSequence.length &&
    (!activeParticipantId || turnSequence[activeTurnIndex] === activeParticipantId)
  ) {
    return activeTurnIndex
  }

  if (!activeParticipantId) {
    return -1
  }

  return turnSequence.indexOf(activeParticipantId)
}

function groupCompleteRounds(
  turnSequence: string[],
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
): TurnPreviewGroup[] {
  const participantTarget = participants.length
  const groups: TurnPreviewGroup[] = []
  let currentGroup: string[] = []
  let seenParticipants = new Set<string>()
  let currentStartIndex = 0

  turnSequence.forEach((participantId, index) => {
    currentGroup.push(participantId)
    seenParticipants.add(participantId)

    if (seenParticipants.size === participantTarget) {
      groups.push({
        number: groups.length + 1,
        label: `Rodada ${groups.length + 1}`,
        isPartial: false,
        entries: mapEntries(currentGroup, teams, participants, currentStartIndex),
      })
      currentGroup = []
      seenParticipants = new Set<string>()
      currentStartIndex = index + 1
    }
  })

  if (currentGroup.length) {
    groups.push({
      number: groups.length + 1,
      label: `Rodada ${groups.length + 1}`,
      isPartial: true,
      entries: mapEntries(currentGroup, teams, participants, currentStartIndex),
    })
  }

  return groups
}

function mapEntries(
  participantIds: string[],
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  startIndex: number,
): TurnPreviewEntry[] {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]))
  const teamById = new Map(teams.map((team) => [team.id, team]))
  const seenInGroup = new Set<string>()

  return participantIds.flatMap((participantId, localIndex) => {
    const participant = participantById.get(participantId)
    if (!participant?.teamId) {
      return []
    }

    const repeatedInGroup = seenInGroup.has(participantId)
    seenInGroup.add(participantId)

    return [
      {
        turnNumber: startIndex + localIndex + 1,
        participantId,
        participantName: participant.name,
        teamId: participant.teamId,
        teamName: teamById.get(participant.teamId)?.name ?? 'Time',
        teamColor: teamById.get(participant.teamId)?.color ?? 'var(--color-primary)',
        repeatedInGroup,
      },
    ]
  })
}

function rotateAwayFromTeam(
  sequence: string[],
  participants: TriviaParticipant[],
  previousTeamId?: string,
): string[] {
  if (!sequence.length || !previousTeamId) {
    return sequence
  }

  const firstParticipant = participants.find((participant) => participant.id === sequence[0])
  if (firstParticipant?.teamId !== previousTeamId) {
    return sequence
  }

  const differentIndex = sequence.findIndex((participantId) => {
    const participant = participants.find((item) => item.id === participantId)
    return participant?.teamId !== previousTeamId
  })

  if (differentIndex <= 0) {
    return sequence
  }

  return [...sequence.slice(differentIndex), ...sequence.slice(0, differentIndex)]
}
