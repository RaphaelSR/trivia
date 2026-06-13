/**
 * Testes para useCloudSync
 *
 * Cenários cobertos:
 *  1. PUSH quando enabled=true e session muda (com teams)
 *  2. Não faz PUSH de sessão sem teams
 *  3. PUSH não ocorre quando disabled (deslogado)
 *  4. RECONCILE use-cloud → onRestore chamado com cloudSession
 *  5. RECONCILE keep-local → push + flush
 *  6. RECONCILE none → nada acontece
 *  7. Falha de reconcile não propaga
 *  8. dispose chamado no unmount
 *  9. reconciledRef reseta quando enabled volta a false → re-reconcilia na próxima ativação
 */

// Mocks ANTES dos imports
const mockPushSnapshot = jest.fn()
const mockFlushNow = jest.fn().mockResolvedValue(undefined)
const mockReconcile = jest.fn()
const mockDispose = jest.fn()
const mockHasPendingSync = jest.fn().mockReturnValue(false)
const mockGetStatus = jest.fn().mockReturnValue('idle')
// subscribe: stores the listener so tests can trigger status changes
let _capturedListener: ((s: string) => void) | null = null
const mockSubscribe = jest.fn((listener: (s: string) => void) => {
  _capturedListener = listener
  // Immediately call with current status (matching real behavior)
  listener(mockGetStatus())
  return jest.fn() // unsubscribe noop
})

jest.mock('@/modules/game/infrastructure/cloud-session-sync', () => ({
  createCloudSessionSync: jest.fn(() => ({
    pushSnapshot: mockPushSnapshot,
    flushNow: mockFlushNow,
    reconcile: mockReconcile,
    dispose: mockDispose,
    hasPendingSync: mockHasPendingSync,
    pullActiveSnapshot: jest.fn().mockResolvedValue(null),
    getStatus: mockGetStatus,
    subscribe: mockSubscribe,
  })),
}))

import { renderHook, act } from '@testing-library/react'
import { useCloudSync } from '@/modules/game/application/useCloudSync'
import type { TriviaSession } from '@/modules/trivia/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<TriviaSession> = {}): TriviaSession {
  return {
    id: 'sess-1',
    title: 'Test Session',
    scheduledAt: new Date().toISOString(),
    theme: {
      id: 'default',
      name: 'Default',
      palette: { background: '#000', primary: '#fff', secondary: '#aaa', accent: '#bbb', surface: '#ccc' },
    },
    teams: [{ id: 'team-a', name: 'Time A', color: '#f00', order: 0, members: [], score: 0 }],
    participants: [],
    board: [],
    activeTeamId: '',
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: [],
    ...overrides,
  }
}

const defaultProps = {
  session: makeSession(),
  enabled: true,
  title: 'Test Session',
  onRestore: jest.fn(),
  localUpdatedAtIso: new Date(Date.now() - 60_000).toISOString(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFlushNow.mockResolvedValue(undefined)
  mockReconcile.mockResolvedValue({ action: 'none' })
  mockGetStatus.mockReturnValue('idle')
  _capturedListener = null
  // Re-wire subscribe mock (clearAllMocks resets it)
  mockSubscribe.mockImplementation((listener: (s: string) => void) => {
    _capturedListener = listener
    listener(mockGetStatus())
    return jest.fn()
  })
})

// ── Suite 1: PUSH ─────────────────────────────────────────────────────────────

describe('useCloudSync — PUSH', () => {
  it('chama pushSnapshot quando enabled=true e session tem teams', async () => {
    const { rerender } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    // Initial render with teams triggers push
    expect(mockPushSnapshot).toHaveBeenCalledWith(defaultProps.session, { title: defaultProps.title })

    const updatedSession = makeSession({ id: 'sess-1', title: 'Updated' })
    const updatedTitle = 'Updated'
    await act(async () => {
      rerender({ ...defaultProps, session: updatedSession, title: updatedTitle })
    })

    expect(mockPushSnapshot).toHaveBeenCalledWith(updatedSession, { title: updatedTitle })
  })

  it('faz flushNow imediato no primeiro push da ativacao (upload inicial sem esperar debounce)', async () => {
    await act(async () => {
      renderHook((props) => useCloudSync(props), { initialProps: defaultProps })
      await Promise.resolve()
    })

    // Primeiro push de uma ativacao com times → flush imediato (nao fica preso em local-only)
    expect(mockFlushNow).toHaveBeenCalled()
  })

  it('nao faz flush imediato quando a sessao nao tem times', async () => {
    const sessionWithoutTeams = makeSession({ teams: [] })
    await act(async () => {
      renderHook((props) => useCloudSync(props), {
        initialProps: { ...defaultProps, session: sessionWithoutTeams },
      })
      await Promise.resolve()
    })

    expect(mockPushSnapshot).not.toHaveBeenCalled()
    expect(mockFlushNow).not.toHaveBeenCalled()
  })

  it('NÃO chama pushSnapshot quando session não tem teams', () => {
    const sessionWithoutTeams = makeSession({ teams: [] })

    renderHook(
      (props) => useCloudSync(props),
      { initialProps: { ...defaultProps, session: sessionWithoutTeams } },
    )

    expect(mockPushSnapshot).not.toHaveBeenCalled()
  })

  it('NÃO chama pushSnapshot quando enabled=false', () => {
    renderHook(
      (props) => useCloudSync(props),
      { initialProps: { ...defaultProps, enabled: false } },
    )

    expect(mockPushSnapshot).not.toHaveBeenCalled()
  })

  it('para de fazer push quando enabled muda de true para false', async () => {
    const { rerender } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    mockPushSnapshot.mockClear()

    const updatedSession = makeSession({ id: 'sess-1', title: 'Changed' })
    await act(async () => {
      rerender({ ...defaultProps, enabled: false, session: updatedSession })
    })

    expect(mockPushSnapshot).not.toHaveBeenCalled()
  })
})

// ── Suite 2: RECONCILE ────────────────────────────────────────────────────────

describe('useCloudSync — RECONCILE use-cloud', () => {
  it('chama onRestore com cloudSession quando action=use-cloud', async () => {
    const cloudSession = makeSession({ id: 'cloud-1', title: 'From Cloud' })
    mockReconcile.mockResolvedValue({ action: 'use-cloud', cloudSession })

    const onRestore = jest.fn()

    await act(async () => {
      renderHook(
        (props) => useCloudSync(props),
        { initialProps: { ...defaultProps, onRestore } },
      )
      // drain microtasks for the async reconcile
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onRestore).toHaveBeenCalledWith(cloudSession)
  })

  it('NÃO chama onRestore quando action=none', async () => {
    mockReconcile.mockResolvedValue({ action: 'none' })

    const onRestore = jest.fn()

    await act(async () => {
      renderHook(
        (props) => useCloudSync(props),
        { initialProps: { ...defaultProps, onRestore } },
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onRestore).not.toHaveBeenCalled()
  })
})

describe('useCloudSync — RECONCILE keep-local', () => {
  it('faz push + flushNow quando action=keep-local', async () => {
    mockReconcile.mockResolvedValue({ action: 'keep-local' })

    await act(async () => {
      renderHook(
        (props) => useCloudSync(props),
        { initialProps: defaultProps },
      )
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockPushSnapshot).toHaveBeenCalled()
    expect(mockFlushNow).toHaveBeenCalled()
  })
})

describe('useCloudSync — RECONCILE only once per activation', () => {
  it('reconcile roda apenas 1 vez por ativação (re-renders não re-disparam)', async () => {
    mockReconcile.mockResolvedValue({ action: 'none' })

    const { rerender } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const firstCallCount = mockReconcile.mock.calls.length
    expect(firstCallCount).toBe(1)

    // Multiple re-renders with same enabled=true should not re-reconcile
    const updatedSession = makeSession({ title: 'Updated' })
    await act(async () => {
      rerender({ ...defaultProps, session: updatedSession })
      rerender({ ...defaultProps, session: updatedSession })
    })

    expect(mockReconcile).toHaveBeenCalledTimes(firstCallCount)
  })

  it('reconcile roda novamente quando enabled vai de false para true (re-ativação)', async () => {
    mockReconcile.mockResolvedValue({ action: 'none' })

    const { rerender } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: { ...defaultProps, enabled: false } },
    )

    expect(mockReconcile).not.toHaveBeenCalled()

    await act(async () => {
      rerender({ ...defaultProps, enabled: true })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockReconcile).toHaveBeenCalledTimes(1)

    // Disable and re-enable: should reconcile again
    await act(async () => {
      rerender({ ...defaultProps, enabled: false })
    })

    await act(async () => {
      rerender({ ...defaultProps, enabled: true })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockReconcile).toHaveBeenCalledTimes(2)
  })
})

// ── Suite 3: Resiliência ──────────────────────────────────────────────────────

describe('useCloudSync — resiliência', () => {
  it('falha no reconcile não propaga e não lança', async () => {
    mockReconcile.mockRejectedValue(new Error('Network error'))

    await expect(
      act(async () => {
        renderHook(
          (props) => useCloudSync(props),
          { initialProps: defaultProps },
        )
        await Promise.resolve()
        await Promise.resolve()
      })
    ).resolves.not.toThrow()
  })

  it('onRestore não é chamado quando reconcile falha', async () => {
    mockReconcile.mockRejectedValue(new Error('Network error'))
    const onRestore = jest.fn()

    await act(async () => {
      renderHook(
        (props) => useCloudSync(props),
        { initialProps: { ...defaultProps, onRestore } },
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onRestore).not.toHaveBeenCalled()
  })
})

// ── Suite 4: dispose ──────────────────────────────────────────────────────────

describe('useCloudSync — dispose no unmount', () => {
  it('chama dispose ao desmontar', () => {
    const { unmount } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    unmount()

    expect(mockDispose).toHaveBeenCalledTimes(1)
  })
})

// ── Suite 5: status retornado ─────────────────────────────────────────────────

describe('useCloudSync — status de UI', () => {
  it('retorna local-only quando disabled=false', () => {
    const { result } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: { ...defaultProps, enabled: false } },
    )

    expect(result.current.status).toBe('local-only')
  })

  it('retorna local-only para status idle (nenhum push ainda)', () => {
    mockGetStatus.mockReturnValue('idle')

    const { result } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    expect(result.current.status).toBe('local-only')
  })

  it('retorna syncing quando serviço emite syncing', async () => {
    mockGetStatus.mockReturnValue('idle')

    const { result } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    // Simulate service transitioning to syncing
    await act(async () => {
      _capturedListener?.('syncing')
    })

    expect(result.current.status).toBe('syncing')
  })

  it('retorna synced quando serviço emite synced', async () => {
    mockGetStatus.mockReturnValue('idle')

    const { result } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    await act(async () => {
      _capturedListener?.('synced')
    })

    expect(result.current.status).toBe('synced')
  })

  it('retorna pending quando serviço emite pending', async () => {
    mockGetStatus.mockReturnValue('idle')

    const { result } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    await act(async () => {
      _capturedListener?.('pending')
    })

    expect(result.current.status).toBe('pending')
  })

  it('volta para local-only quando enabled muda de true para false', async () => {
    const { result, rerender } = renderHook(
      (props) => useCloudSync(props),
      { initialProps: defaultProps },
    )

    // Simulate synced state
    await act(async () => {
      _capturedListener?.('synced')
    })
    expect(result.current.status).toBe('synced')

    // Disable sync
    await act(async () => {
      rerender({ ...defaultProps, enabled: false })
    })

    expect(result.current.status).toBe('local-only')
  })
})
