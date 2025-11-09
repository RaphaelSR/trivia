import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import type { TriviaTeam, TriviaParticipant, TriviaColumn } from '@/modules/trivia/types'
import type { TeamDraft } from '../types/control.types'
import {
  addTeamDraft,
  removeTeamDraft,
  updateTeamDraft,
  moveTeamDraft,
  addParticipantDraft,
  removeParticipantDraft,
  updateParticipantDraft,
  moveParticipantDraft,
  canSaveTeams,
} from '../utils/teamUtils'
import {
  convertDraftsToTeams,
  convertDraftsToParticipants,
  generateTurnSequence,
} from '../utils/sessionUtils'

/**
 * Hook para gerenciar times e participantes
 */
export function useTeamManagement(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  board: Array<{ tiles: Array<unknown> }>,
  updateTeamsAndParticipants: (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence?: string[]
  ) => void
) {
  const [teamDrafts, setTeamDrafts] = useState<TeamDraft[]>([])

  useEffect(() => {
    if (teams.length > 0) {
      const drafts: TeamDraft[] = teams.map((team) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        members: team.members.map((memberId) => {
          const participant = participants.find((p) => p.id === memberId)
          return {
            id: participant?.id ?? memberId,
            name: participant?.name ?? 'Participante',
            role: participant?.role ?? 'player',
          }
        }),
      }))
      setTeamDrafts(drafts)
    }
  }, [teams, participants])

  const canSave = useMemo(() => canSaveTeams(teamDrafts), [teamDrafts])

  const addTeam = () => {
    setTeamDrafts((prev) => addTeamDraft(prev))
  }

  const removeTeam = (teamId: string) => {
    if (window.confirm('Remover este time e os participantes associados?')) {
      setTeamDrafts((prev) => removeTeamDraft(prev, teamId))
      toast.success('Time removido')
    }
  }

  const updateTeam = (teamId: string, updates: Partial<Omit<TeamDraft, 'id' | 'members'>>) => {
    setTeamDrafts((prev) => updateTeamDraft(prev, teamId, updates))
  }

  const moveTeam = (teamId: string, direction: -1 | 1) => {
    setTeamDrafts((prev) => moveTeamDraft(prev, teamId, direction))
  }

  const addParticipant = (teamId: string) => {
    setTeamDrafts((prev) => addParticipantDraft(prev, teamId))
  }

  const removeParticipant = (teamId: string, participantId: string) => {
    setTeamDrafts((prev) => removeParticipantDraft(prev, teamId, participantId))
  }

  const updateParticipant = (
    teamId: string,
    participantId: string,
    updates: Partial<{ id: string; name: string; role: 'host' | 'assistant' | 'player' }>
  ) => {
    setTeamDrafts((prev) => updateParticipantDraft(prev, teamId, participantId, updates))
  }

  const moveParticipant = (teamId: string, participantId: string, direction: -1 | 1) => {
    setTeamDrafts((prev) => moveParticipantDraft(prev, teamId, participantId, direction))
  }

  const saveTeams = () => {
    const newTeams = convertDraftsToTeams(teamDrafts, teams)
    const newParticipants = convertDraftsToParticipants(teamDrafts)
    const sortedTeams = [...newTeams].sort((a, b) => a.order - b.order)
    const newTurnSequence = generateTurnSequence(sortedTeams, board as TriviaColumn[])

    updateTeamsAndParticipants(newTeams, newParticipants, newTurnSequence)
    toast.success('Times atualizados e sequência regenerada')
  }

  return {
    teamDrafts,
    canSave,
    addTeam,
    removeTeam,
    updateTeam,
    moveTeam,
    addParticipant,
    removeParticipant,
    updateParticipant,
    moveParticipant,
    saveTeams,
  }
}

