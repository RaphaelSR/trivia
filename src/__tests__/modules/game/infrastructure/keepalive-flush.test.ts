/**
 * Tests for sendKeepaliveSessionPatch
 *
 * Strategy:
 * - Mock @/shared/services/supabase.client to control getSupabaseRestConfig()
 *   and getCachedAuth()
 * - Mock global.fetch and assert the RPC request shape (keepalive, headers, URL)
 */

jest.mock('@/shared/services/supabase.client', () => ({
  getSupabaseRestConfig: jest.fn(),
  getCachedAuth: jest.fn(),
}))

import { getSupabaseRestConfig, getCachedAuth } from '@/shared/services/supabase.client'
import { sendKeepaliveSessionPatch } from '@/modules/game/infrastructure/keepalive-flush'
import type { TriviaSession } from '@/modules/trivia/types'

const mockRestConfig = getSupabaseRestConfig as jest.Mock
const mockCachedAuth = getCachedAuth as jest.Mock

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

function makeSnapshot() {
  return { title: 'Minha sessão', mode: 'cloud', session: makeSession() }
}

describe('sendKeepaliveSessionPatch', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch

    mockRestConfig.mockReturnValue({
      restUrl: 'https://proj.supabase.co/rest/v1',
      anonKey: 'anon-key',
    })
    mockCachedAuth.mockReturnValue({
      accessToken: 'jwt-token',
      userId: 'user-abc',
    })
  })

  it('returns false and does not fetch when Supabase is not configured', () => {
    mockRestConfig.mockReturnValue(null)
    expect(sendKeepaliveSessionPatch(makeSnapshot())).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false and does not fetch when there is no cached auth', () => {
    mockCachedAuth.mockReturnValue(null)
    expect(sendKeepaliveSessionPatch(makeSnapshot())).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fires the atomic lifecycle RPC with keepalive:true', () => {
    expect(sendKeepaliveSessionPatch(makeSnapshot())).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://proj.supabase.co/rest/v1/rpc/save_online_session_snapshot',
    )
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(init.headers.apikey).toBe('anon-key')
    expect(init.headers.Authorization).toBe('Bearer jwt-token')

    const body = JSON.parse(init.body)
    expect(body.p_title).toBe('Minha sessão')
    expect(body.p_mode).toBe('cloud')
    expect(body.p_session.id).toBe('session-1')
  })

  it('não expõe userId na URL; a RPC usa auth.uid()', () => {
    mockCachedAuth.mockReturnValue({ accessToken: 't', userId: 'a&b=c' })
    sendKeepaliveSessionPatch(makeSnapshot())
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proj.supabase.co/rest/v1/rpc/save_online_session_snapshot')
    expect(url).not.toContain('a&b')
  })

  it('returns false without fetching when the body exceeds the keepalive budget', () => {
    const bigSession = makeSession({ title: 'x'.repeat(70_000) })
    expect(
      sendKeepaliveSessionPatch({ title: 'big', mode: 'cloud', session: bigSession }),
    ).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns true even when the fetch promise rejects (never throws)', () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    expect(sendKeepaliveSessionPatch(makeSnapshot())).toBe(true)
  })

  it('returns false when fetch throws synchronously', () => {
    fetchMock.mockImplementation(() => {
      throw new Error('keepalive budget exceeded')
    })
    expect(sendKeepaliveSessionPatch(makeSnapshot())).toBe(false)
  })
})
