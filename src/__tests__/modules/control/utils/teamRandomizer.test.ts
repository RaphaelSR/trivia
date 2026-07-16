import { buildRandomizedTeamDrafts } from '@/modules/control/utils/teamUtils'
import type { ParticipantDraft, TeamDraft } from '@/modules/control/types/control.types'

describe('buildRandomizedTeamDrafts', () => {
  it('preserva IDs, e-mails e papéis ao balancear um elenco 1/2/3', () => {
    const drafts: TeamDraft[] = [
      { id: 'a', name: 'Time A', color: '#111111', members: [] },
      { id: 'b', name: 'Time B', color: '#222222', members: [] },
      { id: 'c', name: 'Time C', color: '#333333', members: [] },
    ]
    const candidates: ParticipantDraft[] = [
      { id: 'a1', name: 'A1', role: 'host', email: 'a1@example.com' },
      { id: 'b1', name: 'B1', role: 'player' },
      { id: 'b2', name: 'B2', role: 'assistant' },
      { id: 'c1', name: 'C1', role: 'player' },
      { id: 'c2', name: 'C2', role: 'player' },
      { id: 'c3', name: 'C3', role: 'player' },
    ]

    const result = buildRandomizedTeamDrafts(drafts, candidates, 3, () => 0.35)
    const flattened = result.flatMap((team) => team.members)

    expect(result.map((team) => team.members.length)).toEqual([2, 2, 2])
    expect(result.map((team) => team.id)).toEqual(['a', 'b', 'c'])
    expect(flattened.map((member) => member.id).sort()).toEqual(candidates.map((member) => member.id).sort())
    expect(flattened.find((member) => member.id === 'a1')).toMatchObject({
      role: 'host',
      email: 'a1@example.com',
    })
    expect(flattened.find((member) => member.id === 'b2')?.role).toBe('assistant')
  })

  it('ignora linhas sem nome e recusa mais times do que pessoas válidas', () => {
    const result = buildRandomizedTeamDrafts([], [
      { id: '1', name: 'Alice', role: 'player' },
      { id: '2', name: '  ', role: 'player' },
    ], 2, () => 0)
    expect(result).toEqual([])
  })
})
