import {
  createTeamId,
  createParticipantId,
  createNewTeamDraft,
  createNewParticipantDraft,
  addTeamDraft,
  removeTeamDraft,
  updateTeamDraft,
  moveTeamDraft,
  addParticipantDraft,
  removeParticipantDraft,
  updateParticipantDraft,
  moveParticipantDraft,
  canSaveTeams,
} from '../../../../modules/control/utils/teamUtils'
import type { TeamDraft } from '../../../../modules/control/types/control.types'

describe('teamUtils', () => {
  describe('createTeamId', () => {
    it('deve gerar IDs únicos', () => {
      const id1 = createTeamId()
      const id2 = createTeamId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^team-[a-f0-9]+-[a-f0-9]+$/)
      expect(id2).toMatch(/^team-[a-f0-9]+-[a-f0-9]+$/)
    })
  })

  describe('createParticipantId', () => {
    it('deve gerar IDs únicos', () => {
      const id1 = createParticipantId()
      const id2 = createParticipantId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^participant-[a-f0-9]+-[a-f0-9]+$/)
      expect(id2).toMatch(/^participant-[a-f0-9]+-[a-f0-9]+$/)
    })
  })

  describe('createNewTeamDraft', () => {
    it('deve criar draft de time com valores padrão', () => {
      const draft = createNewTeamDraft(0)
      expect(draft.name).toBe('Novo time 1')
      expect(draft.color).toBe('var(--color-primary)')
      expect(draft.members).toHaveLength(1)
      expect(draft.members[0].name).toBe('Participante')
      expect(draft.members[0].role).toBe('player')
      expect(draft.id).toMatch(/^team-/)
    })

    it('deve usar índice correto no nome', () => {
      const draft = createNewTeamDraft(5)
      expect(draft.name).toBe('Novo time 6')
    })
  })

  describe('createNewParticipantDraft', () => {
    it('deve criar draft de participante com valores padrão', () => {
      const draft = createNewParticipantDraft()
      expect(draft.name).toBe('Participante')
      expect(draft.role).toBe('player')
      expect(draft.id).toMatch(/^participant-/)
    })
  })

  describe('addTeamDraft', () => {
    it('deve adicionar time à lista', () => {
      const drafts: TeamDraft[] = []
      const result = addTeamDraft(drafts)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Novo time 1')
    })

    it('deve adicionar time mantendo os existentes', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
      ]
      const result = addTeamDraft(drafts)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Time 1')
      expect(result[1].name).toBe('Novo time 2')
    })
  })

  describe('removeTeamDraft', () => {
    it('deve remover time da lista', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
      ]
      const result = removeTeamDraft(drafts, 'team-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('team-2')
    })

    it('deve retornar lista inalterada se time não existir', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
      ]
      const result = removeTeamDraft(drafts, 'team-999')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('team-1')
    })
  })

  describe('updateTeamDraft', () => {
    it('deve atualizar propriedades do time', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
      ]
      const result = updateTeamDraft(drafts, 'team-1', { name: 'Time Atualizado', color: '#fff' })
      expect(result[0].name).toBe('Time Atualizado')
      expect(result[0].color).toBe('#fff')
    })

    it('deve manter times não atualizados inalterados', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
      ]
      const result = updateTeamDraft(drafts, 'team-1', { name: 'Time Atualizado' })
      expect(result[0].name).toBe('Time Atualizado')
      expect(result[1].name).toBe('Time 2')
    })
  })

  describe('moveTeamDraft', () => {
    it('deve mover time para cima (direção -1)', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
        { id: 'team-3', name: 'Time 3', color: '#000', members: [] },
      ]
      const result = moveTeamDraft(drafts, 'team-2', -1)
      expect(result[0].id).toBe('team-2')
      expect(result[1].id).toBe('team-1')
      expect(result[2].id).toBe('team-3')
    })

    it('deve mover time para baixo (direção 1)', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
        { id: 'team-3', name: 'Time 3', color: '#000', members: [] },
      ]
      const result = moveTeamDraft(drafts, 'team-2', 1)
      expect(result[0].id).toBe('team-1')
      expect(result[1].id).toBe('team-3')
      expect(result[2].id).toBe('team-2')
    })

    it('não deve mover se já estiver no início', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
      ]
      const result = moveTeamDraft(drafts, 'team-1', -1)
      expect(result).toEqual(drafts)
    })

    it('não deve mover se já estiver no fim', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
        { id: 'team-2', name: 'Time 2', color: '#000', members: [] },
      ]
      const result = moveTeamDraft(drafts, 'team-2', 1)
      expect(result).toEqual(drafts)
    })

    it('deve retornar lista inalterada se time não existir', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
      ]
      const result = moveTeamDraft(drafts, 'team-999', -1)
      expect(result).toEqual(drafts)
    })
  })

  describe('addParticipantDraft', () => {
    it('deve adicionar participante ao time', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [{ id: 'p1', name: 'P1', role: 'player' }],
        },
      ]
      const result = addParticipantDraft(drafts, 'team-1')
      expect(result[0].members).toHaveLength(2)
      expect(result[0].members[1].name).toBe('Participante')
      expect(result[0].members[1].role).toBe('player')
    })

    it('não deve adicionar participante a time inexistente', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [],
        },
      ]
      const result = addParticipantDraft(drafts, 'team-999')
      expect(result[0].members).toHaveLength(0)
    })
  })

  describe('removeParticipantDraft', () => {
    it('deve remover participante do time', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
          ],
        },
      ]
      const result = removeParticipantDraft(drafts, 'team-1', 'p1')
      expect(result[0].members).toHaveLength(1)
      expect(result[0].members[0].id).toBe('p2')
    })

    it('não deve remover participante de time inexistente', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [{ id: 'p1', name: 'P1', role: 'player' }],
        },
      ]
      const result = removeParticipantDraft(drafts, 'team-999', 'p1')
      expect(result[0].members).toHaveLength(1)
    })
  })

  describe('updateParticipantDraft', () => {
    it('deve atualizar propriedades do participante', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [{ id: 'p1', name: 'P1', role: 'player' }],
        },
      ]
      const result = updateParticipantDraft(drafts, 'team-1', 'p1', { name: 'P1 Atualizado', role: 'host' })
      expect(result[0].members[0].name).toBe('P1 Atualizado')
      expect(result[0].members[0].role).toBe('host')
    })

    it('não deve atualizar participante de time inexistente', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [{ id: 'p1', name: 'P1', role: 'player' }],
        },
      ]
      const result = updateParticipantDraft(drafts, 'team-999', 'p1', { name: 'Atualizado' })
      expect(result[0].members[0].name).toBe('P1')
    })
  })

  describe('moveParticipantDraft', () => {
    it('deve mover participante para cima (direção -1)', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
            { id: 'p3', name: 'P3', role: 'player' },
          ],
        },
      ]
      const result = moveParticipantDraft(drafts, 'team-1', 'p2', -1)
      expect(result[0].members[0].id).toBe('p2')
      expect(result[0].members[1].id).toBe('p1')
      expect(result[0].members[2].id).toBe('p3')
    })

    it('deve mover participante para baixo (direção 1)', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
            { id: 'p3', name: 'P3', role: 'player' },
          ],
        },
      ]
      const result = moveParticipantDraft(drafts, 'team-1', 'p2', 1)
      expect(result[0].members[0].id).toBe('p1')
      expect(result[0].members[1].id).toBe('p3')
      expect(result[0].members[2].id).toBe('p2')
    })

    it('não deve mover se já estiver no início', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
          ],
        },
      ]
      const result = moveParticipantDraft(drafts, 'team-1', 'p1', -1)
      expect(result[0].members[0].id).toBe('p1')
    })

    it('não deve mover se já estiver no fim', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
          ],
        },
      ]
      const result = moveParticipantDraft(drafts, 'team-1', 'p2', 1)
      expect(result[0].members[1].id).toBe('p2')
    })
  })

  describe('canSaveTeams', () => {
    it('deve retornar false para lista vazia', () => {
      expect(canSaveTeams([])).toBe(false)
    })

    it('deve retornar false se time tiver nome vazio', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: '   ', color: '#000', members: [{ id: 'p1', name: 'P1', role: 'player' }] },
      ]
      expect(canSaveTeams(drafts)).toBe(false)
    })

    it('deve retornar false se time não tiver membros', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [] },
      ]
      expect(canSaveTeams(drafts)).toBe(false)
    })

    it('deve retornar false se participante tiver nome vazio', () => {
      const drafts: TeamDraft[] = [
        { id: 'team-1', name: 'Time 1', color: '#000', members: [{ id: 'p1', name: '   ', role: 'player' }] },
      ]
      expect(canSaveTeams(drafts)).toBe(false)
    })

    it('deve retornar true se todos os times e participantes forem válidos', () => {
      const drafts: TeamDraft[] = [
        {
          id: 'team-1',
          name: 'Time 1',
          color: '#000',
          members: [
            { id: 'p1', name: 'P1', role: 'player' },
            { id: 'p2', name: 'P2', role: 'player' },
          ],
        },
        {
          id: 'team-2',
          name: 'Time 2',
          color: '#000',
          members: [{ id: 'p3', name: 'P3', role: 'host' }],
        },
      ]
      expect(canSaveTeams(drafts)).toBe(true)
    })
  })
})

