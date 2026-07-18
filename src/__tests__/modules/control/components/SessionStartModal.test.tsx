import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { SessionStartModal } from '@/modules/control/components/SessionStartModal'
import { createEmptySession } from '@/modules/trivia/utils/createEmptySession'
import type { SessionStartCandidate } from '@/modules/game/application/useSessionStartup'
import type { GameEvent } from '@/modules/trivia/types'

function candidate(
  source: 'device' | 'cloud',
  sessionId: string,
  options: { active?: boolean; events?: GameEvent[]; title?: string } = {},
): SessionStartCandidate {
  const session = createEmptySession({ title: options.title ?? `Partida ${source}` })
  session.id = sessionId
  session.teams = [{ id: 'team-a', name: 'Aurora', color: '#fff', order: 0, members: [], score: 20 }]
  session.eventLog = options.events ?? []
  return {
    key: `${source}:${sessionId}`,
    source,
    active: options.active ?? true,
    record: {
      metadata: {
        id: sessionId,
        name: session.title,
        createdAt: '2026-07-17T10:00:00.000Z',
        lastModified: source === 'device' ? '2026-07-17T12:00:00.000Z' : '2026-07-17T11:00:00.000Z',
        isActive: options.active ?? true,
        mode: 'offline',
        duration: 10,
        isSaved: true,
      },
      session,
    },
  }
}

const firstEvent: GameEvent = {
  id: 'event-1',
  type: 'trivia-award',
  source: 'trivia',
  timestamp: '2026-07-17T10:30:00.000Z',
  pointsAwarded: 10,
  teamId: 'team-a',
  film: 'Matrix',
}

describe('SessionStartModal', () => {
  it('explica que IDs diferentes são partidas diferentes e permite escolher qualquer uma', () => {
    const local = candidate('device', 'local-id', { events: [firstEvent] })
    const cloud = candidate('cloud', 'cloud-id')
    const onChoose = jest.fn()
    const onNew = jest.fn()

    render(
      <SessionStartModal
        status="decision"
        candidates={[local, cloud]}
        activeDevice={local}
        activeCloud={cloud}
        cloudUnavailable={false}
        onRetry={jest.fn()}
        onChoose={onChoose}
        onNew={onNew}
      />,
    )

    expect(screen.getByText(/são partidas diferentes/i)).toBeInTheDocument()
    expect(screen.getByText(/Aurora respondeu Matrix por 10 pts/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /continuar esta partida/i })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: /continuar esta partida/i })[1])
    expect(onChoose).toHaveBeenCalledWith(cloud)
    fireEvent.click(screen.getByRole('button', { name: /^nova partida$/i }))
    expect(onNew).toHaveBeenCalled()
  })

  it('recomenda o dispositivo quando seu log está à frente da mesma partida', () => {
    const secondEvent = { ...firstEvent, id: 'event-2', timestamp: '2026-07-17T10:40:00.000Z' }
    const local = candidate('device', 'same-id', { events: [firstEvent, secondEvent] })
    const cloud = candidate('cloud', 'same-id', { events: [firstEvent] })

    render(
      <SessionStartModal
        status="decision"
        candidates={[local, cloud]}
        activeDevice={local}
        activeCloud={cloud}
        cloudUnavailable={false}
        onRetry={jest.fn()}
        onChoose={jest.fn()}
        onNew={jest.fn()}
      />,
    )

    expect(screen.getByText(/versão deste dispositivo tem mais progresso/i)).toBeInTheDocument()
    expect(screen.getAllByText('Recomendada')).toHaveLength(1)
  })

  it('bloqueia decisão automática quando a nuvem está indisponível e oferece retry', () => {
    const onRetry = jest.fn()
    render(
      <SessionStartModal
        status="decision"
        candidates={[]}
        activeDevice={null}
        activeCloud={null}
        cloudUnavailable
        onRetry={onRetry}
        onChoose={jest.fn()}
        onNew={jest.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível consultar a nuvem/i)
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(onRetry).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /fechar/i })).not.toBeInTheDocument()
  })

  it('mostra estado de verificação antes de liberar escolhas', () => {
    render(
      <SessionStartModal
        status="checking"
        candidates={[]}
        activeDevice={null}
        activeCloud={null}
        cloudUnavailable={false}
        onRetry={jest.fn()}
        onChoose={jest.fn()}
        onNew={jest.fn()}
      />,
    )

    expect(screen.getByText(/procurando partidas salvas/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^nova partida$/i })).not.toBeInTheDocument()
  })
})
