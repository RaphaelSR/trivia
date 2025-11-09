import type { TeamDraft, ParticipantDraft } from '../types/control.types'

/**
 * Gera um ID único para time
 */
export function createTeamId(): string {
  return `team-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

/**
 * Gera um ID único para participante
 */
export function createParticipantId(): string {
  return `participant-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

/**
 * Cria um novo draft de time
 */
export function createNewTeamDraft(index: number): TeamDraft {
  return {
    id: createTeamId(),
    name: `Novo time ${index + 1}`,
    color: 'var(--color-primary)',
    members: [
      {
        id: createParticipantId(),
        name: 'Participante',
        role: 'player',
      },
    ],
  }
}

/**
 * Cria um novo draft de participante
 */
export function createNewParticipantDraft(): ParticipantDraft {
  return {
    id: createParticipantId(),
    name: 'Participante',
    role: 'player',
  }
}

/**
 * Adiciona um novo time aos drafts
 */
export function addTeamDraft(teamDrafts: TeamDraft[]): TeamDraft[] {
  return [
    ...teamDrafts,
    createNewTeamDraft(teamDrafts.length),
  ]
}

/**
 * Remove um time dos drafts
 */
export function removeTeamDraft(teamDrafts: TeamDraft[], teamId: string): TeamDraft[] {
  return teamDrafts.filter((team) => team.id !== teamId)
}

/**
 * Atualiza propriedades de um time
 */
export function updateTeamDraft(
  teamDrafts: TeamDraft[],
  teamId: string,
  updates: Partial<Omit<TeamDraft, 'id' | 'members'>>
): TeamDraft[] {
  return teamDrafts.map((team) =>
    team.id === teamId ? { ...team, ...updates } : team
  )
}

/**
 * Move um time na lista (reordena)
 */
export function moveTeamDraft(teamDrafts: TeamDraft[], teamId: string, direction: -1 | 1): TeamDraft[] {
  const index = teamDrafts.findIndex((team) => team.id === teamId)
  if (index === -1) return teamDrafts
  
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= teamDrafts.length) return teamDrafts
  
  const next = [...teamDrafts]
  const [moved] = next.splice(index, 1)
  next.splice(newIndex, 0, moved)
  return next
}

/**
 * Adiciona um participante a um time
 */
export function addParticipantDraft(teamDrafts: TeamDraft[], teamId: string): TeamDraft[] {
  return teamDrafts.map((team) =>
    team.id === teamId
      ? {
          ...team,
          members: [
            ...team.members,
            createNewParticipantDraft(),
          ],
        }
      : team
  )
}

/**
 * Remove um participante de um time
 */
export function removeParticipantDraft(
  teamDrafts: TeamDraft[],
  teamId: string,
  participantId: string
): TeamDraft[] {
  return teamDrafts.map((team) =>
    team.id === teamId
      ? {
          ...team,
          members: team.members.filter((member) => member.id !== participantId),
        }
      : team
  )
}

/**
 * Atualiza propriedades de um participante
 */
export function updateParticipantDraft(
  teamDrafts: TeamDraft[],
  teamId: string,
  participantId: string,
  updates: Partial<ParticipantDraft>
): TeamDraft[] {
  return teamDrafts.map((team) =>
    team.id === teamId
      ? {
          ...team,
          members: team.members.map((member) =>
            member.id === participantId ? { ...member, ...updates } : member
          ),
        }
      : team
  )
}

/**
 * Move um participante dentro de um time (reordena)
 */
export function moveParticipantDraft(
  teamDrafts: TeamDraft[],
  teamId: string,
  participantId: string,
  direction: -1 | 1
): TeamDraft[] {
  return teamDrafts.map((team) => {
    if (team.id !== teamId) return team
    
    const index = team.members.findIndex((member) => member.id === participantId)
    if (index === -1) return team
    
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= team.members.length) return team
    
    const members = [...team.members]
    const [moved] = members.splice(index, 1)
    members.splice(newIndex, 0, moved)
    
    return {
      ...team,
      members,
    }
  })
}

/**
 * Valida se os drafts de times podem ser salvos
 */
export function canSaveTeams(teamDrafts: TeamDraft[]): boolean {
  if (!teamDrafts.length) return false
  return teamDrafts.every(
    (team) =>
      team.name.trim() &&
      team.members.length > 0 &&
      team.members.every((member) => member.name.trim())
  )
}

