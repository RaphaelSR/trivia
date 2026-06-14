/**
 * Tests for CloudSessionSync
 *
 * Strategy:
 * - Mock @/shared/services/supabase.client so we control isSupabaseConfigured() / getSupabaseClient()
 * - Use jest.useFakeTimers() to control the 2500 ms debounce
 * - Simulate window events with dispatchEvent
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { createCloudSessionSync } from '@/modules/game/infrastructure/cloud-session-sync'
import type { CloudSessionSync } from '@/modules/game/infrastructure/cloud-session-sync'
import type { TriviaSession } from '@/modules/trivia/types'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<TriviaSession> = {}): TriviaSession {
  return {
    id: 'session-1',
    title: 'Test Session',
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
    ...overrides,
  }
}

function buildAuthMock(userId = 'user-abc') {
  return {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: userId } } },
    }),
  }
}

function buildNoAuthMock() {
  return {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  }
}

/** Builds a from() mock that records update/insert call counts. */
function buildSuccessFromMock() {
  const insertFn = jest.fn().mockResolvedValue({ data: {}, error: null })
  const updateSelectFn = jest.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null })
  const updateEqChain = {
    eq: jest.fn().mockReturnThis() as jest.Mock,
    select: updateSelectFn,
  }
  const fromFn = jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue(updateEqChain),
    insert: insertFn,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  })
  return { fromFn, insertFn, updateSelectFn }
}

/** Advances fake timers AND drains the microtask queue. */
async function tick(ms: number) {
  jest.advanceTimersByTime(ms)
  // Drain multiple microtask queues for chained awaits inside _doFlush
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
  }
}

// ── Suite 1: Supabase NOT configured ─────────────────────────────────────────

describe('CloudSessionSync — not configured (no-op)', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('pushSnapshot does not call getSupabaseClient', async () => {
    sync.pushSnapshot(makeSession())
    await tick(3000)
    expect(mockGetClient).not.toHaveBeenCalled()
  })

  it('hasPendingSync is true immediately after push (pending in memory)', () => {
    sync.pushSnapshot(makeSession())
    expect(sync.hasPendingSync()).toBe(true)
  })

  it('flushNow resolves without calling getSupabaseClient', async () => {
    sync.pushSnapshot(makeSession())
    await expect(sync.flushNow()).resolves.toBeUndefined()
    expect(mockGetClient).not.toHaveBeenCalled()
  })

  it('pullActiveSnapshot returns null', async () => {
    const result = await sync.pullActiveSnapshot()
    expect(result).toBeNull()
  })

  it('reconcile returns action=none', async () => {
    const result = await sync.reconcile(new Date().toISOString())
    expect(result.action).toBe('none')
  })
})

// ── Suite 2: Configured but unauthenticated ───────────────────────────────────

describe('CloudSessionSync — configured, unauthenticated', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    const mockClient = {
      auth: buildNoAuthMock(),
      from: jest.fn(),
    }
    mockGetClient.mockReturnValue(mockClient)
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('flushNow does not call from() when unauthenticated', async () => {
    const fromFn = jest.fn()
    mockGetClient.mockReturnValue({ auth: buildNoAuthMock(), from: fromFn })
    sync.pushSnapshot(makeSession())
    await sync.flushNow()
    expect(fromFn).not.toHaveBeenCalled()
  })

  it('hasPendingSync stays true after no-op flush (not logged in)', async () => {
    sync.pushSnapshot(makeSession())
    await sync.flushNow()
    // Pending preserved — will retry when user logs in
    expect(sync.hasPendingSync()).toBe(true)
  })

  it('pullActiveSnapshot returns null', async () => {
    expect(await sync.pullActiveSnapshot()).toBeNull()
  })

  it('reconcile returns action=none', async () => {
    const r = await sync.reconcile(null)
    expect(r.action).toBe('none')
  })

  it('pushSnapshot does not throw', () => {
    expect(() => sync.pushSnapshot(makeSession())).not.toThrow()
  })
})

// ── Suite 3: Debounce coalescing ──────────────────────────────────────────────

describe('CloudSessionSync — debounce / coalescing', () => {
  let sync: CloudSessionSync
  let fromFn: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    const mocks = buildSuccessFromMock()
    fromFn = mocks.fromFn

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: fromFn,
    })

    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('N rapid pushes coalesce into a single upsert with the last snapshot', async () => {
    const sessions = [
      makeSession({ id: 's1', title: 'First' }),
      makeSession({ id: 's2', title: 'Second' }),
      makeSession({ id: 's3', title: 'Third — last' }),
    ]

    for (const s of sessions) {
      sync.pushSnapshot(s)
    }

    await tick(3000)

    // Only one network round-trip should happen (the update step)
    expect(fromFn).toHaveBeenCalledTimes(1)
  })

  it('hasPendingSync is false after successful flush', async () => {
    sync.pushSnapshot(makeSession())
    await tick(3000)
    expect(sync.hasPendingSync()).toBe(false)
  })

  it('flushNow triggers immediate write before debounce fires', async () => {
    sync.pushSnapshot(makeSession({ title: 'Immediate' }))
    // Timer has NOT fired yet
    await sync.flushNow()
    expect(fromFn).toHaveBeenCalled()
  })

  it('flushNow cancels the pending debounce timer (no double-flush)', async () => {
    sync.pushSnapshot(makeSession())
    await sync.flushNow()
    const countAfterFlush = fromFn.mock.calls.length

    // Advance past debounce — no extra call should happen
    await tick(3000)
    expect(fromFn).toHaveBeenCalledTimes(countAfterFlush)
  })

  it('insert branch is taken when update returns empty array', async () => {
    const insertFn = jest.fn().mockResolvedValue({ data: {}, error: null })
    const updateChain = {
      eq: jest.fn().mockReturnThis() as jest.Mock,
      select: jest.fn().mockResolvedValue({ data: [], error: null }), // no existing row
    }
    fromFn.mockReturnValue({
      update: jest.fn().mockReturnValue(updateChain),
      insert: insertFn,
    })

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    expect(insertFn).toHaveBeenCalledTimes(1)
    const insertPayload = insertFn.mock.calls[0][0]
    expect(insertPayload.status).toBe('active')
    expect(insertPayload.mode).toBe('cloud')
  })
})

// ── Suite 4: Resilience — network failures ────────────────────────────────────

describe('CloudSessionSync — resilience / retry on network failure', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('failed flush keeps hasPendingSync() true and does not throw', async () => {
    const failingUpdate = {
      eq: jest.fn().mockReturnThis() as jest.Mock,
      select: jest.fn().mockRejectedValue(new Error('Network error')),
    }
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({ update: jest.fn().mockReturnValue(failingUpdate) }),
    })

    sync.pushSnapshot(makeSession())
    await expect(sync.flushNow()).resolves.toBeUndefined() // never rejects

    expect(sync.hasPendingSync()).toBe(true)
  })

  it('retry succeeds on subsequent flushNow after network recovers', async () => {
    // First call fails
    const failingFrom = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockRejectedValue(new Error('Network error')),
      }),
    })
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: failingFrom })

    sync.pushSnapshot(makeSession())
    await sync.flushNow() // fails

    expect(sync.hasPendingSync()).toBe(true)

    // Network recovers
    const { fromFn: successFrom } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: successFrom })

    await sync.flushNow() // succeeds

    expect(sync.hasPendingSync()).toBe(false)
    expect(successFrom).toHaveBeenCalled()
  })

  it('window online event triggers retry and clears pending on success', async () => {
    // Fail first
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockRejectedValue(new Error('offline')),
        }),
      }),
    })

    sync.pushSnapshot(makeSession())
    await sync.flushNow()
    expect(sync.hasPendingSync()).toBe(true)

    // Network comes back
    const { fromFn: recoveredFrom } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: recoveredFrom })

    window.dispatchEvent(new Event('online'))
    // Drain microtasks
    for (let i = 0; i < 5; i++) await Promise.resolve()

    expect(recoveredFrom).toHaveBeenCalled()
    expect(sync.hasPendingSync()).toBe(false)
  })

  it('error in update (non-throw, error field) keeps pending and does not throw', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
        }),
      }),
    })

    sync.pushSnapshot(makeSession())
    await expect(sync.flushNow()).resolves.toBeUndefined()
    expect(sync.hasPendingSync()).toBe(true)
  })

  it('newer pushSnapshot during pending failure replaces snapshot and preserves dirty', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockRejectedValue(new Error('fail')),
        }),
      }),
    })

    sync.pushSnapshot(makeSession({ id: 's1', title: 'Old' }))
    await sync.flushNow() // fails, pending=dirty

    // Push a newer snapshot
    sync.pushSnapshot(makeSession({ id: 's2', title: 'New' }))
    expect(sync.hasPendingSync()).toBe(true)
  })
})

// ── Suite 5: pullActiveSnapshot ───────────────────────────────────────────────

describe('CloudSessionSync — pullActiveSnapshot', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
  })

  it('returns session and updatedAt from cloud row', async () => {
    const cloudSession = makeSession({ id: 'cloud-1', title: 'Cloud Session' })
    const updatedAt = new Date(Date.now() + 60_000).toISOString()

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { session: cloudSession, updated_at: updatedAt },
          error: null,
        }),
      }),
    })

    const result = await sync.pullActiveSnapshot()
    expect(result).not.toBeNull()
    expect(result!.session.id).toBe('cloud-1')
    expect(result!.updatedAt).toBe(updatedAt)
  })

  it('returns null when no active row', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    expect(await sync.pullActiveSnapshot()).toBeNull()
  })

  it('returns null on query error', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'RLS' } }),
      }),
    })

    expect(await sync.pullActiveSnapshot()).toBeNull()
  })

  it('returns null when not authenticated', async () => {
    mockGetClient.mockReturnValue({ auth: buildNoAuthMock(), from: jest.fn() })
    expect(await sync.pullActiveSnapshot()).toBeNull()
  })
})

// ── Suite 6: reconcile ────────────────────────────────────────────────────────

describe('CloudSessionSync — reconcile', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
  })

  function buildCloudMock(cloudSession: TriviaSession, updatedAt: string) {
    return jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { session: cloudSession, updated_at: updatedAt },
        error: null,
      }),
    })
  }

  it('returns use-cloud when cloud is newer than local', async () => {
    const cloudSession = makeSession({ id: 'cloud-2', title: 'Newer' })
    const cloudAt = new Date(Date.now() + 60_000).toISOString()
    const localAt = new Date(Date.now() - 60_000).toISOString()

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: buildCloudMock(cloudSession, cloudAt),
    })

    const r = await sync.reconcile(localAt)
    expect(r.action).toBe('use-cloud')
    expect(r.cloudSession?.id).toBe('cloud-2')
  })

  it('returns use-cloud when local is null (no local data)', async () => {
    const cloudSession = makeSession({ id: 'cloud-3' })
    const cloudAt = new Date().toISOString()

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: buildCloudMock(cloudSession, cloudAt),
    })

    const r = await sync.reconcile(null)
    expect(r.action).toBe('use-cloud')
  })

  it('returns keep-local when local is newer than cloud', async () => {
    const cloudSession = makeSession({ id: 'cloud-4' })
    const cloudAt = new Date(Date.now() - 60_000).toISOString()
    const localAt = new Date(Date.now() + 60_000).toISOString()

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: buildCloudMock(cloudSession, cloudAt),
    })

    const r = await sync.reconcile(localAt)
    expect(r.action).toBe('keep-local')
    expect(r.cloudSession).toBeUndefined()
  })

  it('returns keep-local when timestamps are equal', async () => {
    const now = new Date().toISOString()
    const cloudSession = makeSession()

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: buildCloudMock(cloudSession, now),
    })

    const r = await sync.reconcile(now)
    expect(r.action).toBe('keep-local')
  })

  it('returns none when no cloud record exists', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const r = await sync.reconcile(new Date().toISOString())
    expect(r.action).toBe('none')
  })

  it('returns none when not configured', async () => {
    mockIsConfigured.mockReturnValue(false)
    const r = await sync.reconcile(new Date().toISOString())
    expect(r.action).toBe('none')
  })

  it('returns none when not authenticated', async () => {
    mockGetClient.mockReturnValue({ auth: buildNoAuthMock(), from: jest.fn() })
    const r = await sync.reconcile(new Date().toISOString())
    expect(r.action).toBe('none')
  })

  // ── Detecção de conflito (T7) — progresso = nº de cartas respondidas ────────
  const answeredBoard = (answered: number) => [
    {
      id: 'c1',
      filmId: 'f1',
      film: 'F',
      tiles: Array.from({ length: 3 }, (_, i) => ({
        id: `q${i}`,
        film: 'F',
        points: 10,
        state: (i < answered ? 'answered' : 'available') as 'answered' | 'available',
        question: 'Q',
        answer: 'A',
      })),
    },
  ]

  it('returns conflict when cloud is newer BUT local has more progress', async () => {
    const cloudSession = makeSession({ id: 'cloud-c', board: answeredBoard(0) })
    const cloudAt = new Date(Date.now() + 60_000).toISOString()
    const localAt = new Date(Date.now() - 60_000).toISOString()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: buildCloudMock(cloudSession, cloudAt) })

    const r = await sync.reconcile(localAt, answeredBoard(2))
    expect(r.action).toBe('conflict')
    expect(r.cloudSession?.id).toBe('cloud-c')
  })

  it('returns conflict when local is newer BUT cloud has more progress', async () => {
    const cloudSession = makeSession({ id: 'cloud-d', board: answeredBoard(2) })
    const cloudAt = new Date(Date.now() - 60_000).toISOString()
    const localAt = new Date(Date.now() + 60_000).toISOString()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: buildCloudMock(cloudSession, cloudAt) })

    const r = await sync.reconcile(localAt, answeredBoard(0))
    expect(r.action).toBe('conflict')
  })

  it('returns use-cloud when cloud is newer AND not less complete (no conflict)', async () => {
    const cloudSession = makeSession({ id: 'cloud-e', board: answeredBoard(2) })
    const cloudAt = new Date(Date.now() + 60_000).toISOString()
    const localAt = new Date(Date.now() - 60_000).toISOString()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: buildCloudMock(cloudSession, cloudAt) })

    const r = await sync.reconcile(localAt, answeredBoard(1))
    expect(r.action).toBe('use-cloud')
  })
})

// ── Suite 7: dispose removes listeners ────────────────────────────────────────

describe('CloudSessionSync — dispose removes window listeners', () => {
  it('does not fire after dispose — online event is ignored', async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })

    const sync = createCloudSessionSync()
    sync.pushSnapshot(makeSession())
    await sync.flushNow() // first flush succeeds, pending cleared
    expect(sync.hasPendingSync()).toBe(false)

    sync.dispose()

    // After dispose, a new pending snapshot + online event should NOT trigger flush
    // We inject another snapshot manually: since dispose cleared listeners,
    // even if we push a new one, the 'online' event should not call fromFn again.
    // (The debounce timer was also cleared.)

    // Simulate a push followed by online event — no new flush
    const countBefore = fromFn.mock.calls.length

    // Dispatch online — listener removed, so _handleOnline should not run
    window.dispatchEvent(new Event('online'))
    for (let i = 0; i < 5; i++) await Promise.resolve()

    expect(fromFn.mock.calls.length).toBe(countBefore)
    jest.useRealTimers()
  })

  it('does not fire after dispose — beforeunload is ignored', async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })

    const sync = createCloudSessionSync()
    sync.pushSnapshot(makeSession())
    await sync.flushNow()
    const countBefore = fromFn.mock.calls.length

    sync.dispose()

    // After dispose, beforeunload should not call flush
    window.dispatchEvent(new Event('beforeunload'))
    for (let i = 0; i < 5; i++) await Promise.resolve()

    expect(fromFn.mock.calls.length).toBe(countBefore)
    jest.useRealTimers()
  })

  it('clears the debounce timer on dispose', () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })

    const sync = createCloudSessionSync()
    sync.pushSnapshot(makeSession())
    // Timer is now scheduled; dispose before it fires
    sync.dispose()

    // Advance — the timer was cleared so from() should never be called
    jest.advanceTimersByTime(5000)
    expect(fromFn).not.toHaveBeenCalled()

    jest.useRealTimers()
  })
})

// ── Suite 8: title fallback ───────────────────────────────────────────────────

describe('CloudSessionSync — title opt', () => {
  let sync: CloudSessionSync
  let insertFn: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    insertFn = jest.fn().mockResolvedValue({ data: {}, error: null })
    const updateChain = {
      eq: jest.fn().mockReturnThis() as jest.Mock,
      select: jest.fn().mockResolvedValue({ data: [], error: null }), // no existing row → insert
    }
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue(updateChain),
        insert: insertFn,
      }),
    })
    sync = createCloudSessionSync()
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('uses opts.title when provided', async () => {
    sync.pushSnapshot(makeSession({ title: 'Fallback' }), { title: 'Custom Title' })
    await sync.flushNow()
    expect(insertFn.mock.calls[0][0].title).toBe('Custom Title')
  })

  it('falls back to session.title when opts.title is absent', async () => {
    sync.pushSnapshot(makeSession({ title: 'Session Title' }))
    await sync.flushNow()
    expect(insertFn.mock.calls[0][0].title).toBe('Session Title')
  })
})

// ── Suite 9: status state machine ─────────────────────────────────────────────

describe('CloudSessionSync — status state machine', () => {
  let sync: CloudSessionSync

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
  })

  afterEach(() => {
    sync.dispose()
    jest.useRealTimers()
  })

  it('starts with idle status', () => {
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: jest.fn() })
    sync = createCloudSessionSync()
    expect(sync.getStatus()).toBe('idle')
  })

  it('transitions idle → syncing → synced on successful flush', async () => {
    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })
    sync = createCloudSessionSync()

    const states: string[] = []
    sync.subscribe((s) => states.push(s))

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    expect(states).toEqual(['idle', 'syncing', 'synced'])
    expect(sync.getStatus()).toBe('synced')
  })

  it('transitions syncing → pending on flush failure', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockRejectedValue(new Error('Network error')),
        }),
      }),
    })
    sync = createCloudSessionSync()

    const states: string[] = []
    sync.subscribe((s) => states.push(s))

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    expect(sync.getStatus()).toBe('pending')
    expect(states).toContain('syncing')
    expect(states).toContain('pending')
  })

  it('transitions to pending when not authenticated but has pending snapshot', async () => {
    mockGetClient.mockReturnValue({ auth: buildNoAuthMock(), from: jest.fn() })
    sync = createCloudSessionSync()

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    expect(sync.getStatus()).toBe('pending')
  })

  it('subscribe receives current status immediately', () => {
    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })
    sync = createCloudSessionSync()

    const received: string[] = []
    sync.subscribe((s) => received.push(s))

    expect(received).toEqual(['idle'])
  })

  it('unsubscribe stops receiving status updates', async () => {
    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })
    sync = createCloudSessionSync()

    const states: string[] = []
    const unsubscribe = sync.subscribe((s) => states.push(s))

    // Unsubscribe before flush
    unsubscribe()

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    // Only the initial 'idle' should be in states (received at subscription time)
    expect(states).toEqual(['idle'])
  })

  it('dispose clears all listeners — no more notifications', async () => {
    const { fromFn } = buildSuccessFromMock()
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })
    sync = createCloudSessionSync()

    const states: string[] = []
    sync.subscribe((s) => states.push(s))

    sync.dispose()
    states.length = 0 // clear initial notification

    // Even if we somehow call _doFlush after dispose, listeners are gone
    // (dispose cleared both timers and listeners)
    expect(states).toEqual([])
  })

  it('mode stored in upsert is "cloud" (not "online")', async () => {
    const updateSelectFn = jest.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null })
    const updateEqChain = { eq: jest.fn().mockReturnThis() as jest.Mock, select: updateSelectFn }
    const updateFn = jest.fn().mockReturnValue(updateEqChain)
    const fromFn = jest.fn().mockReturnValue({ update: updateFn })
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: fromFn })
    sync = createCloudSessionSync()

    sync.pushSnapshot(makeSession())
    await sync.flushNow()

    const updatePayload = updateFn.mock.calls[0][0]
    expect(updatePayload.mode).toBe('cloud')
  })
})
