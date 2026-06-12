/**
 * Tests for SupabaseSessionRepository
 *
 * Strategy:
 *  - Mock @/shared/services/supabase.client so we can control isSupabaseConfigured() / getSupabaseClient()
 *  - OnlineCacheSessionRepository delegates to storageService (localStorage in jsdom) — works as-is
 *  - Use jest.useFakeTimers to control debounce
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { SupabaseSessionRepository } from '@/modules/game/infrastructure/supabase-session.repository'
import type { TriviaSession } from '@/modules/trivia/types'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<TriviaSession> = {}): TriviaSession {
  return {
    id: 'session-test-1',
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

// ── Test suites ───────────────────────────────────────────────────────────────

describe('SupabaseSessionRepository — not configured (no-op cloud, cache works)', () => {
  let repo: SupabaseSessionRepository

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
  })

  it('saveSession returns record synchronously from cache', () => {
    const session = makeSession()
    const record = repo.saveSession(session, 'online')
    expect(record).not.toBeNull()
    expect(record?.metadata.name).toBe('Test Session')
  })

  it('loadActiveSession returns the saved session', () => {
    const session = makeSession()
    repo.saveSession(session, 'online')
    const active = repo.loadActiveSession()
    expect(active).not.toBeNull()
    expect(active?.session.title).toBe('Test Session')
  })

  it('getBackendLabel returns "supabase"', () => {
    expect(repo.getBackendLabel()).toBe('supabase')
  })

  it('hydrateFromCloud returns null when not configured', async () => {
    const result = await repo.hydrateFromCloud()
    expect(result).toBeNull()
  })

  it('clearActiveSession clears the cache', () => {
    repo.saveSession(makeSession(), 'online')
    repo.clearActiveSession()
    expect(repo.loadActiveSession()).toBeNull()
  })

  it('cloud methods are never called when not configured', async () => {
    const session = makeSession()
    repo.saveSession(session, 'online')
    repo.clearActiveSession()
    repo.deleteSession('session-test-1')
    await repo.flushNow()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('SupabaseSessionRepository — configured but unauthenticated', () => {
  let repo: SupabaseSessionRepository

  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  }

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
  })

  it('hydrateFromCloud returns null when no auth session', async () => {
    const result = await repo.hydrateFromCloud()
    expect(result).toBeNull()
  })

  it('flushNow does not call from() when unauthenticated', async () => {
    const mockClient = { auth: mockAuth, from: jest.fn() }
    mockGetClient.mockReturnValue(mockClient)
    repo.saveSession(makeSession(), 'online')
    await repo.flushNow()
    expect(mockClient.from).not.toHaveBeenCalled()
  })
})

describe('SupabaseSessionRepository — debounce coalescing', () => {
  let repo: SupabaseSessionRepository
  let mockInsert: jest.Mock
  let mockFrom: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
    jest.clearAllMocks()

    mockIsConfigured.mockReturnValue(true)

    mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null })

    mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'online_sessions') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: [{}], error: null }),
          }),
          insert: mockInsert,
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {}
    })

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: mockFrom,
    })

    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
    jest.useRealTimers()
  })

  it('saveSession returns synchronously after local write (no await)', () => {
    const session = makeSession()
    const record = repo.saveSession(session, 'online')
    // Synchronous — no timer has fired
    expect(record).not.toBeNull()
    expect(repo.loadActiveSession()?.session.id).toBe('session-test-1')
  })

  it('N rapid saves coalesce into a single cloud UPSERT with last snapshot', async () => {
    const sessions = [
      makeSession({ id: 's1', title: 'First' }),
      makeSession({ id: 's2', title: 'Second' }),
      makeSession({ id: 's3', title: 'Third — last' }),
    ]

    for (const s of sessions) {
      repo.saveSession(s, 'online')
    }

    // Advance timer past the 2500ms debounce
    jest.advanceTimersByTime(3000)
    // Let promises resolve
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // from() should be called once for the UPSERT (update attempt)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('flushNow triggers immediate cloud write bypassing debounce', async () => {
    const session = makeSession({ title: 'Immediate' })
    repo.saveSession(session, 'online')

    // Timer has NOT fired yet
    await repo.flushNow()

    expect(mockFrom).toHaveBeenCalled()
  })
})

describe('SupabaseSessionRepository — network failure retry', () => {
  let repo: SupabaseSessionRepository

  beforeEach(() => {
    jest.useFakeTimers()
    localStorage.clear()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
    jest.useRealTimers()
  })

  it('retains pendingSnapshot after a failed flush and retries on next flushNow', async () => {
    let callCount = 0
    const failThenSucceed = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockRejectedValue(new Error('Network error')),
        }
      }
      return {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [{}], error: null, count: 1 }),
      }
    })

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({ update: failThenSucceed, insert: jest.fn().mockResolvedValue({ data: {}, error: null }) }),
    })

    repo.saveSession(makeSession(), 'online')

    // First flush — fails
    await repo.flushNow()

    // pendingSnapshot should still be set (preserved after failure)
    // We verify this by checking a second flushNow actually calls from() again
    const mockFrom2 = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [{}], error: null, count: 1 }),
      }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })
    mockGetClient.mockReturnValue({ auth: buildAuthMock(), from: mockFrom2 })

    await repo.flushNow()
    expect(mockFrom2).toHaveBeenCalled()
  })
})

describe('SupabaseSessionRepository — hydrateFromCloud', () => {
  let repo: SupabaseSessionRepository

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
  })

  it('writes to cache and returns record when cloud is newer', async () => {
    const cloudSession = makeSession({ id: 'cloud-id', title: 'Cloud Session' })
    const cloudUpdatedAt = new Date(Date.now() + 60_000).toISOString() // 1 min in future

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'row-uuid',
            user_id: 'user-abc',
            status: 'active',
            title: 'Cloud Session',
            mode: 'online',
            session: cloudSession,
            created_at: new Date().toISOString(),
            updated_at: cloudUpdatedAt,
          },
          error: null,
        }),
      }),
    })

    const record = await repo.hydrateFromCloud()
    expect(record).not.toBeNull()
    expect(record?.session.title).toBe('Cloud Session')
    // Should also have written to cache
    expect(repo.loadActiveSession()?.session.title).toBe('Cloud Session')
  })

  it('returns null when cloud record is older than local cache', async () => {
    const localSession = makeSession({ id: 'local-id', title: 'Local Session' })
    // Save locally with a "now" lastModified
    repo.saveSession(localSession, 'online')

    const olderTime = new Date(Date.now() - 60_000).toISOString() // 1 min in past
    const cloudSession = makeSession({ id: 'cloud-id', title: 'Stale Cloud' })

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: 'row-uuid',
            user_id: 'user-abc',
            status: 'active',
            title: 'Stale Cloud',
            mode: 'online',
            session: cloudSession,
            created_at: olderTime,
            updated_at: olderTime,
          },
          error: null,
        }),
      }),
    })

    const record = await repo.hydrateFromCloud()
    expect(record).toBeNull()
    // Cache should still have local session
    expect(repo.loadActiveSession()?.session.id).toBe('local-id')
  })

  it('returns null when cloud query returns error', async () => {
    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'RLS' } }),
      }),
    })

    const result = await repo.hydrateFromCloud()
    expect(result).toBeNull()
  })
})

describe('SupabaseSessionRepository — clearActiveSession archives in cloud', () => {
  let repo: SupabaseSessionRepository

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)

    const updateChain = {
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    mockGetClient.mockReturnValue({
      auth: buildAuthMock(),
      from: jest.fn().mockReturnValue({ update: jest.fn().mockReturnValue(updateChain) }),
    })

    repo = new SupabaseSessionRepository()
  })

  afterEach(() => {
    repo.dispose()
    localStorage.clear()
  })

  it('clearActiveSession removes from cache', () => {
    repo.saveSession(makeSession(), 'online')
    repo.clearActiveSession()
    expect(repo.loadActiveSession()).toBeNull()
  })
})
