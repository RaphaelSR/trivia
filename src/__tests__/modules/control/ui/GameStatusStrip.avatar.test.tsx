import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { GameStatusStrip } from '@/modules/control/ui/GameStatusStrip'

const current = { id: 'p1', name: 'Ana', role: 'player' as const, teamId: 't1' }
const next = { id: 'p2', name: 'Bruno', role: 'player' as const, teamId: 't2' }
const teamA = { id: 't1', name: 'Time A', color: '#f00', score: 0, order: 0, members: ['p1'] }
const teamB = { id: 't2', name: 'Time B', color: '#00f', score: 0, order: 1, members: ['p2'] }

it('mostra avatar atual e proximo sem alterar a ordem do jogo', () => {
  render(
    <GameStatusStrip
      activeParticipant={current}
      activeTeam={teamA}
      nextParticipant={next}
      nextTeam={teamB}
      currentTurnLabel="1/2"
      scoreboard={[]}
      participantIdentities={{
        p1: {
          participantClientId: 'p1',
          profileId: 'u1',
          accountDisplayName: 'Ana conta',
          avatarPath: 'u1/avatar.webp',
          avatarUpdatedAt: null,
          avatarUrl: 'https://cdn.test/ana.webp',
        },
      }}
    />,
  )

  expect(screen.getByRole('img', { name: 'Avatar de Ana' })).toHaveAttribute('src', 'https://cdn.test/ana.webp')
  expect(screen.getByRole('img', { name: 'Iniciais de Bruno' })).toHaveTextContent('BR')
  expect(screen.getByText(/próximo: bruno/i)).toBeInTheDocument()
})
