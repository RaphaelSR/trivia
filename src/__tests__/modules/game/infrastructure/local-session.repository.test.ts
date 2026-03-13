import { LocalSessionRepository } from '@/modules/game/infrastructure/local-session.repository'
import type { TriviaSession } from '@/modules/trivia/types'

describe('LocalSessionRepository', () => {
  const repository = new LocalSessionRepository()

  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and restores active session', () => {
    const session: TriviaSession = {
      id: 'session-1',
      title: 'Sessao Teste',
      scheduledAt: new Date().toISOString(),
      theme: {
        id: 'default-dark',
        name: 'Tema Escuro',
        palette: {
          background: '#000',
          primary: '#111',
          secondary: '#222',
          accent: '#333',
          surface: '#444',
        },
      },
      teams: [],
      participants: [],
      board: [],
      activeTeamId: '',
      activeParticipantId: null,
      turnSequence: [],
      mimicaScores: [],
    }

    const saved = repository.saveSession(session, 'offline')
    expect(saved?.metadata.name).toBe('Sessao Teste')
    expect(repository.loadActiveSession()?.session.title).toBe('Sessao Teste')
    expect(repository.loadSessionHistory()).toHaveLength(1)
    expect(repository.loadSession('session-1')?.id).toBe('session-1')
  })
})
