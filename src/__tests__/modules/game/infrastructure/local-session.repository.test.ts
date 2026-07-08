import { LocalSessionRepository } from '@/modules/game/infrastructure/local-session.repository'
import { storageService } from '@/shared/services/storage.service'
import type { TriviaSession } from '@/modules/trivia/types'

function makeSession(id: string): TriviaSession {
  return {
    id,
    title: `Sessão ${id}`,
    scheduledAt: new Date().toISOString(),
    theme: {
      id: 'default-dark',
      name: 'Tema Escuro',
      palette: { background: '#000', primary: '#111', secondary: '#222', accent: '#333', surface: '#444' },
    },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: '',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: [],
  }
}

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
      activeTurnIndex: 0,
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

describe('LocalSessionRepository — quota e órfãos', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saveSession retorna null quando a escrita falha (quota cheia)', () => {
    const repo = new LocalSessionRepository()
    const spy = jest.spyOn(storageService, 'setJson').mockReturnValue(false)

    const result = repo.saveSession(makeSession('sess-quota'), 'offline', 'Nome')

    expect(result).toBeNull()
    spy.mockRestore()
  })

  it('sessões podadas do índice (MAX_SESSION_HISTORY) têm o arquivo removido', () => {
    const repo = new LocalSessionRepository()
    // enche o histórico até o limite
    for (let i = 0; i < 21; i++) {
      repo.saveSession(makeSession(`sess-${i}`), 'offline', `Sessão ${i}`)
    }

    const history = repo.loadSessionHistory()
    expect(history.length).toBeLessThanOrEqual(20)

    // a mais antiga (sess-0) saiu do índice E não deixou arquivo órfão
    const historyIds = history.map((h) => h.id)
    expect(historyIds).not.toContain('sess-0')
    expect(repo.loadSession('sess-0')).toBeNull()
  })
})
