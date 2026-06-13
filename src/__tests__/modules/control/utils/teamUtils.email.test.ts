/**
 * Testes de persistência do campo email em ParticipantDraft.
 *
 * Garante:
 *  - updateParticipantDraft aceita e persiste email
 *  - createNewParticipantDraft não define email por padrão
 *  - updateParticipantDraft não remove email ao fazer updates parciais de outros campos
 */

import {
  createNewParticipantDraft,
  updateParticipantDraft,
} from '../../../../modules/control/utils/teamUtils'
import type { TeamDraft } from '../../../../modules/control/types/control.types'

const makeTeam = (member: TeamDraft['members'][0]): TeamDraft[] => [
  { id: 'team-1', name: 'Time 1', color: '#000', members: [member] },
]

describe('teamUtils — email em ParticipantDraft', () => {
  describe('createNewParticipantDraft', () => {
    it('não define email por padrão', () => {
      const draft = createNewParticipantDraft()
      expect(draft.email).toBeUndefined()
    })
  })

  describe('updateParticipantDraft — campo email', () => {
    it('persiste o email ao atualizar com { email }', () => {
      const member = { id: 'p1', name: 'Alice', role: 'player' as const }
      const result = updateParticipantDraft(makeTeam(member), 'team-1', 'p1', {
        email: 'alice@example.com',
      })
      expect(result[0].members[0].email).toBe('alice@example.com')
    })

    it('sobrescreve email ao atualizar novamente', () => {
      const member = { id: 'p1', name: 'Alice', role: 'player' as const, email: 'old@example.com' }
      const result = updateParticipantDraft(makeTeam(member), 'team-1', 'p1', {
        email: 'new@example.com',
      })
      expect(result[0].members[0].email).toBe('new@example.com')
    })

    it('não remove email ao atualizar apenas o nome', () => {
      const member = { id: 'p1', name: 'Alice', role: 'player' as const, email: 'alice@example.com' }
      const result = updateParticipantDraft(makeTeam(member), 'team-1', 'p1', { name: 'Alicia' })
      expect(result[0].members[0].email).toBe('alice@example.com')
      expect(result[0].members[0].name).toBe('Alicia')
    })

    it('permite limpar email passando string vazia', () => {
      const member = { id: 'p1', name: 'Alice', role: 'player' as const, email: 'alice@example.com' }
      const result = updateParticipantDraft(makeTeam(member), 'team-1', 'p1', { email: '' })
      expect(result[0].members[0].email).toBe('')
    })
  })
})
