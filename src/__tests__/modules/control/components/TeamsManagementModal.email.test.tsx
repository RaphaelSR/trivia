/**
 * Testes de gate do campo de e-mail em TeamsManagementModal.
 *
 * Garante:
 *  - O campo de e-mail POR PARTICIPANTE aparece quando gameMode === 'online'
 *  - O campo NÃO aparece nos modos 'demo' e 'offline' (RESTRIÇÃO CRÍTICA)
 *  - datalist de autocomplete presente/ausente por gameMode
 *  - Helper text correto por validade do e-mail
 *  - canSave NÃO depende de e-mail (salvar funciona com e-mail vazio ou inválido)
 *  - Rodapé não-bloqueante exibido quando ≥1 e-mail válido em modo online
 */

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  listMyInvitedContacts: jest.fn().mockResolvedValue([]),
}))

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
  onReplaceDrafts: jest.fn(),
  canRandomizeRoster: true,
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

describe('TeamsManagementModal — datalist de autocomplete', () => {
  it('renderiza datalist#invite-contacts em modo online', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="online" />)
    const datalist = document.getElementById('invite-contacts')
    expect(datalist).not.toBeNull()
    expect(datalist!.tagName.toLowerCase()).toBe('datalist')
  })

  it('NÃO renderiza datalist em modo demo', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="demo" />)
    expect(document.getElementById('invite-contacts')).toBeNull()
  })

  it('NÃO renderiza datalist em modo offline', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="offline" />)
    expect(document.getElementById('invite-contacts')).toBeNull()
  })

  it('input de e-mail conectado ao datalist via list="invite-contacts"', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="online" />)
    const input = screen.getByPlaceholderText('e-mail (opcional, para vincular conta)')
    expect(input).toHaveAttribute('list', 'invite-contacts')
  })
})

describe('TeamsManagementModal — helper text por validade do e-mail', () => {
  it('exibe mensagem positiva para e-mail válido', () => {
    const draftWithValid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'alice@example.com' }],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[draftWithValid]} gameMode="online" />)
    expect(
      screen.getByText('Será vinculado automaticamente quando entrar com este e-mail.'),
    ).toBeInTheDocument()
  })

  it('exibe aviso para e-mail inválido preenchido', () => {
    const draftWithInvalid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'invalido' }],
    }
    render(
      <TeamsManagementModal {...baseProps} teamDrafts={[draftWithInvalid]} gameMode="online" />,
    )
    expect(
      screen.getByText('Verifique o e-mail — sem isto o jogador ainda joga normalmente.'),
    ).toBeInTheDocument()
  })

  it('NÃO exibe helper text quando e-mail está vazio', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="online" />)
    expect(
      screen.queryByText('Será vinculado automaticamente quando entrar com este e-mail.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Verifique o e-mail — sem isto o jogador ainda joga normalmente.'),
    ).not.toBeInTheDocument()
  })

  it('NÃO exibe helper text em modo demo mesmo com e-mail válido preenchido', () => {
    const draftWithValid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'alice@example.com' }],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[draftWithValid]} gameMode="demo" />)
    expect(
      screen.queryByText('Será vinculado automaticamente quando entrar com este e-mail.'),
    ).not.toBeInTheDocument()
  })
})

describe('TeamsManagementModal — canSave não depende de e-mail', () => {
  it('botão Salvar habilitado mesmo sem e-mail preenchido', () => {
    render(<TeamsManagementModal {...baseProps} canSave={true} gameMode="online" />)
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('botão Salvar habilitado com e-mail inválido', () => {
    const draftWithInvalid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'invalido' }],
    }
    render(
      <TeamsManagementModal
        {...baseProps}
        teamDrafts={[draftWithInvalid]}
        canSave={true}
        gameMode="online"
      />,
    )
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('botão Salvar desabilitado apenas quando canSave=false (independente de e-mail)', () => {
    render(<TeamsManagementModal {...baseProps} canSave={false} gameMode="online" />)
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i })
    expect(saveBtn).toBeDisabled()
  })
})

describe('TeamsManagementModal — rodapé não-bloqueante', () => {
  it('exibe rodapé quando há ≥1 e-mail válido em modo online', () => {
    const draftWithValid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'alice@example.com' }],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[draftWithValid]} gameMode="online" />)
    expect(screen.getByText(/O jogo funciona/i)).toBeInTheDocument()
  })

  it('NÃO exibe rodapé sem e-mails válidos', () => {
    render(<TeamsManagementModal {...baseProps} gameMode="online" />)
    expect(screen.queryByText(/O jogo funciona/i)).not.toBeInTheDocument()
  })

  it('NÃO exibe rodapé em modo demo mesmo com e-mail válido', () => {
    const draftWithValid: TeamDraft = {
      id: 'team-1',
      name: 'Time 1',
      color: '#000',
      members: [{ id: 'p1', name: 'Alice', role: 'player', email: 'alice@example.com' }],
    }
    render(<TeamsManagementModal {...baseProps} teamDrafts={[draftWithValid]} gameMode="demo" />)
    expect(screen.queryByText(/O jogo funciona/i)).not.toBeInTheDocument()
  })
})

describe('TeamsManagementModal — gate do convite ao vivo', () => {
  it('aparece somente no modo online autenticado/sincronizável', () => {
    render(
      <TeamsManagementModal
        {...baseProps}
        gameMode="online"
        canInviteLivePlayers
        sessionClientId="session-1"
      />,
    )
    expect(screen.getByText('Convidar jogadores')).toBeInTheDocument()
  })

  it.each(['demo', 'offline'])('não aparece nem inicia rede no modo %s', (gameMode) => {
    const prepare = jest.fn()
    render(
      <TeamsManagementModal
        {...baseProps}
        gameMode={gameMode}
        canInviteLivePlayers
        sessionClientId="session-1"
        onPrepareLiveInvite={prepare}
      />,
    )
    expect(screen.queryByText('Convidar jogadores')).not.toBeInTheDocument()
    expect(prepare).not.toHaveBeenCalled()
  })

  it('exige salvar o draft antes de sincronizar o QR', () => {
    render(
      <TeamsManagementModal
        {...baseProps}
        gameMode="online"
        canInviteLivePlayers
        hasUnsavedLiveRosterChanges
        sessionClientId="session-1"
      />,
    )
    expect(screen.getByText(/salve as alterações de elenco/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir convite ao vivo/i })).toBeDisabled()
  })
})
