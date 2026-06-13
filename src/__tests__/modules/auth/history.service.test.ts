/**
 * Testes para history.service.ts
 * Verifica no-ops sem configuração e comportamento com cliente mockado.
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { saveGameToHistory, listGameHistory } from '@/modules/auth/services/history.service'
import type { GameSummary } from '@/modules/auth/services/history.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

const fakeSummary: GameSummary = {
  scores: { 'Time A': 10, 'Time B': 7 },
  winner: 'Time A',
}

describe('history.service — sem configuração (no-op)', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('saveGameToHistory retorna null', async () => {
    const result = await saveGameToHistory('Jogo Teste', fakeSummary)
    expect(result).toBeNull()
  })

  it('listGameHistory retorna array vazio', async () => {
    const result = await listGameHistory()
    expect(result).toEqual([])
  })
})

describe('history.service — sem sessão ativa', () => {
  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
  })

  it('saveGameToHistory retorna null quando usuário não está logado', async () => {
    const result = await saveGameToHistory('Jogo Teste', fakeSummary)
    expect(result).toBeNull()
  })

  it('listGameHistory retorna array vazio quando usuário não está logado', async () => {
    const result = await listGameHistory()
    expect(result).toEqual([])
  })
})

describe('history.service — com sessão ativa', () => {
  const fakeUser = { id: 'user-uuid-1' }
  const fakeSession = { user: fakeUser }

  // Builder de mock para a query chain do Supabase (.from().insert()... etc)
  function buildQueryMock(resolvedValue: { data: unknown; error: unknown }) {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(resolvedValue),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(resolvedValue),
    }
    return chain
  }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
  })

  it('saveGameToHistory insere e retorna o registro criado', async () => {
    const fakeEntry = {
      id: 'entry-uuid',
      user_id: fakeUser.id,
      title: 'Jogo Teste',
      finished_at: '2026-06-12T00:00:00Z',
      summary: fakeSummary,
      created_at: '2026-06-12T00:00:00Z',
    }
    const qm = buildQueryMock({ data: fakeEntry, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await saveGameToHistory('Jogo Teste', fakeSummary)
    expect(result).toEqual(fakeEntry)
  })

  it('saveGameToHistory retorna null se o insert falhar', async () => {
    const qm = buildQueryMock({ data: null, error: { message: 'RLS violation' } })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await saveGameToHistory('Jogo Teste', fakeSummary)
    expect(result).toBeNull()
  })

  it('listGameHistory retorna array de entradas', async () => {
    const fakeList = [
      { id: 'e1', user_id: fakeUser.id, title: 'G1', finished_at: '2026-06-11T00:00:00Z', summary: fakeSummary, created_at: '2026-06-11T00:00:00Z' },
      { id: 'e2', user_id: fakeUser.id, title: 'G2', finished_at: '2026-06-10T00:00:00Z', summary: fakeSummary, created_at: '2026-06-10T00:00:00Z' },
    ]
    const qm = buildQueryMock({ data: fakeList, error: null })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await listGameHistory()
    expect(result).toEqual(fakeList)
  })

  it('listGameHistory retorna array vazio se a query falhar', async () => {
    const qm = buildQueryMock({ data: null, error: { message: 'network error' } })
    mockGetClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }) },
      from: jest.fn().mockReturnValue(qm),
    })

    const result = await listGameHistory()
    expect(result).toEqual([])
  })
})
