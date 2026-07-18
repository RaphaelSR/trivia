jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { getSupabaseClient, isSupabaseConfigured } from '@/shared/services/supabase.client'
import { listMyCloudSessions } from '@/modules/game/infrastructure/cloud-session-catalog.service'
import { createEmptySession } from '@/modules/trivia/utils/createEmptySession'

const mockConfigured = isSupabaseConfigured as jest.Mock
const mockClient = getSupabaseClient as jest.Mock

describe('cloud session catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfigured.mockReturnValue(true)
  })

  it('lista somente pela conta autenticada e normaliza active/archived', async () => {
    const session = createEmptySession({ title: 'Noite de filmes' })
    const limit = jest.fn().mockResolvedValue({
      data: [{
        id: 'row-1',
        status: 'archived',
        title: 'Noite de filmes',
        mode: 'cloud',
        session,
        created_at: '2026-07-17T10:00:00.000Z',
        updated_at: '2026-07-17T11:00:00.000Z',
      }],
      error: null,
    })
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit,
    }
    mockClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
      from: jest.fn().mockReturnValue(query),
    })

    const result = await listMyCloudSessions()

    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.in).toHaveBeenCalledWith('status', ['active', 'archived'])
    expect(query.limit).toHaveBeenCalledWith(50)
    expect(result.error).toBeNull()
    expect(result.records[0]).toMatchObject({ rowId: 'row-1', status: 'archived', session })
  })

  it('retorna indisponível em erro sem lançar', async () => {
    mockClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
      }),
    })

    await expect(listMyCloudSessions()).resolves.toEqual({ records: [], error: 'unavailable' })
  })

  it('não chama rede quando Supabase está desabilitado', async () => {
    mockConfigured.mockReturnValue(false)
    expect(await listMyCloudSessions()).toEqual({ records: [], error: null })
    expect(mockClient).not.toHaveBeenCalled()
  })
})
