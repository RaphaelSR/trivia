/**
 * Testes de gate do campo de e-mail em TeamsManagementModal.
 *
 * Garante:
 *  - O campo de e-mail POR PARTICIPANTE aparece quando gameMode === 'online'
 *  - O campo NÃO aparece nos modos 'demo' e 'offline' (RESTRIÇÃO CRÍTICA)
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TeamsManagementModal } from '@/modules/control/components/TeamsManagementModal'
import type { TeamDraft } from '@/modules/control/types/control.types'

// Modal usa Portal/Dialog — nenhum mock de router necessário aqui.

const memberDraft = { id: 'p1', name: 'Alice', role: 'player' as const }
const teamDraft: TeamDraft = { id: 'team-1', name: 'Time 1', color: '#000', members: [memberDraft] }

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  teamDrafts: [teamDraft],
  canSave: true,
  onAddTeam: jest.fn(),
  onRemoveTeam: jest.fn(),
  onUpdateTeam: jest.fn(),
  onMoveTeam: jest.fn(),
  onAddParticipant: jest.fn(),
  onRemoveParticipant: jest.fn(),
  onUpdateParticipant: jest.fn(),
  onMoveParticipant: jest.fn(),
  previewTeams: [],
  previewParticipants: [],
  previewTurnSequence: [],
  previewQuestionCount: 0,
  onSave: jest.fn(),
}

describe('TeamsManagementModal — campo de e-mail (gate por gameMode)', () => {
  it('exibe o campo de e-mail quando gameMode === "online"', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="online" />)
    expect(
      screen.getByPlaceholderText('e-mail (opcional, para vincular conta)'),
    ).toBeInTheDocument()
  })

  it('NÃO exibe o campo de e-mail quando gameMode === "demo"', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="demo" />)
    expect(
      screen.queryByPlaceholderText('e-mail (opcional, para vincular conta)'),
    ).not.toBeInTheDocument()
  })

  it('NÃO exibe o campo de e-mail quando gameMode === "offline"', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="offline" />)
    expect(
      screen.queryByPlaceholderText('e-mail (opcional, para vincular conta)'),
    ).not.toBeInTheDocument()
  })

  it('exibe um campo de e-mail por participante (múltiplos) em modo online', () => {
    const twoMemberTeam: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [
        { id: 'p1', name: 'Alice', role: 'player' },
        { id: 'p2', name: 'Bob', role: 'player' },
      ],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[twoMemberTeam]} gameMode="online" />)
    const emailInputs = screen.getAllByPlaceholderText('e-mail (opcional, para vincular conta)')
    expect(emailInputs).toHaveLength(2)
  })

  it('preenche o campo com o e-mail existente do membro em modo online', () => {
    const memberWithEmail: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'alice@example.com' }],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[memberWithEmail]} gameMode="online" />)
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument()
  })
})
