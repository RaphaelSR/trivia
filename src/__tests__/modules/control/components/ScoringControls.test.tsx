/**
 * Testes do ScoringControls — foco no preset "Errou" (regra da casa:
 * metade dos pontos para os outros times) e no atalho do Personalizar.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoringControls } from '@/modules/control/components/ScoringControls'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'

const teams: TriviaTeam[] = [
  { id: 't1', name: 'Time 1', color: '#818cf8', order: 0, score: 0, members: [] },
  { id: 't2', name: 'Time 2', color: '#38bdf8', order: 1, score: 0, members: [] },
  { id: 't3', name: 'Time 3', color: '#fb923c', order: 2, score: 0, members: [] },
]

const participants: TriviaParticipant[] = [
  { id: 'p1', name: 'Japa', teamId: 't2', role: 'player' },
]

function renderControls(onConfirm = jest.fn()) {
  render(
    <ScoringControls
      teams={teams}
      participants={participants}
      activeTeamId="t2"
      activeParticipantId="p1"
      basePoints={15}
      onConfirm={onConfirm}
      onClose={() => {}}
    />,
  )
  return onConfirm
}

describe('ScoringControls — preset "Errou"', () => {
  it('um clique distribui metade para todos os times exceto o da vez', () => {
    const onConfirm = renderControls()

    fireEvent.click(screen.getByText('Errou'))
    fireEvent.click(screen.getByText('Aplicar pontuação'))

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ teamId: 't1', points: 8 }),
      expect.objectContaining({ teamId: 't3', points: 8 }),
    ])
  })

  it('mostra o resumo da regra antes de aplicar', () => {
    renderControls()
    fireEvent.click(screen.getByText('Errou'))
    expect(screen.getByText(/Time 2 errou — 2 time\(s\) recebem 8 pts cada/)).toBeInTheDocument()
  })

  it('Acertou continua dando valor cheio só pro time da vez', () => {
    const onConfirm = renderControls()
    fireEvent.click(screen.getByText('Acertou'))
    fireEvent.click(screen.getByText('Aplicar pontuação'))
    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ teamId: 't2', points: 15, participantId: 'p1' }),
    ])
  })
})

describe('ScoringControls — atalho "Outros · metade" no Personalizar', () => {
  it('preenche todos exceto o time da vez com metade (caso do roubo)', () => {
    const onConfirm = renderControls()

    fireEvent.click(screen.getByText('Personalizar'))
    fireEvent.click(screen.getByText('Outros · metade'))
    fireEvent.click(screen.getByText('Aplicar pontuação'))

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ teamId: 't1', points: 8 }),
      expect.objectContaining({ teamId: 't3', points: 8 }),
    ])
  })
})
