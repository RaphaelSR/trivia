import type { TeamDraft, ParticipantDraft } from '../types/control.types'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import { drawBalancedGroups, type RandomSource } from '@/modules/game/domain/team-draw'
import { i18n } from '@/shared/i18n'

const DRAW_TEAM_COLORS = [
  '#7c3aed',
  '#0ea5e9',
  '#f97316',
  '#10b981',
  '#ec4899',
  '#eab308',
  '#6366f1',
  '#14b8a6',
]

/**
 * Compara apenas a composição editável do elenco. Pontuação e outros estados
 * de jogo não devem criar um checkpoint estrutural por engano.
 */
export function hasRosterChanges(
  currentTeams: TriviaTeam[],
  currentParticipants: TriviaParticipant[],
  nextTeams: TriviaTeam[],
  nextParticipants: TriviaParticipant[],
): boolean {
  const rosterSnapshot = (teams: TriviaTeam[], participants: TriviaParticipant[]) => ({
    teams: teams.map(({ id, name, color, order, members }) => ({ id, name, color, order, members })),
    participants: participants.map(({ id, name, role, teamId, email }) => ({
      id,
      name,
      role,
      teamId,
      email: email ?? null,
    })),
  })

  return JSON.stringify(rosterSnapshot(currentTeams, currentParticipants)) !==
    JSON.stringify(rosterSnapshot(nextTeams, nextParticipants))
}

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
    name: i18n.t('control:teams.defaults.newTeam', { number: index + 1 }),
    color: 'var(--color-primary)',
    members: [
      {
        id: createParticipantId(),
        name: i18n.t('control:teams.defaults.participant'),
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
    name: i18n.t('control:teams.defaults.participant'),
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

/**
 * Monta drafts balanceados sem alterar os drafts recebidos. Os participantes
 * mantêm identidade, papel e e-mail; somente a associação ao time muda.
 */
export function buildRandomizedTeamDrafts(
  currentDrafts: TeamDraft[],
  candidates: ParticipantDraft[],
  teamCount: number,
  random: RandomSource = Math.random,
): TeamDraft[] {
  const validCandidates = candidates
    .filter((candidate) => candidate.name.trim().length > 0)
    .map((candidate) => ({
      ...candidate,
      name: candidate.name.trim(),
      ...(candidate.email?.trim() ? { email: candidate.email.trim() } : { email: undefined }),
    }))

  const groups = drawBalancedGroups(validCandidates, teamCount, random)
  if (!groups.length) return []

  return groups.map((members, index) => {
    const existing = currentDrafts[index]
    return {
      id: existing?.id ?? createTeamId(),
      name: existing?.name.trim() || i18n.t('control:teams.defaults.team', { number: index + 1 }),
      color: existing?.color || DRAW_TEAM_COLORS[index % DRAW_TEAM_COLORS.length],
      members,
    }
  })
}

/** Usa crypto quando disponível, mantendo um fallback simples para testes/SSR. */
export function secureBrowserRandom(): number {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    return Math.random()
  }

  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] / 0x1_0000_0000
}
