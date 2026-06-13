/**
 * Testes para deleteNormalizedGame em normalized-history.service.ts
 *
 * Cenários:
 *  1. No-op (erro amigável) quando Supabase não está configurado
 *  2. Erro quando gameId não é UUID válido
 *  3. Erro quando usuário não está logado
 *  4. Chama delete().eq('id', gameId) quando logado
 *  5. Mapeia erro do Supabase para mensagem amigável
 *  6. Retorna { error: null } em caso de sucesso
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { deleteNormalizedGame } from '@/modules/auth/services/normalized-history.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

const VALID_UUID = '12345678-1234-1234-1234-123456789abc'
const INVALID_ID = 'nao-e-um-uuid'

describe('deleteNormalizedGame — sem configuração', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna erro amigável sem chamar Supabase (ID válido mas sem config)', async () => {
    const result = await deleteNormalizedGame(VALID_UUID)
    expect(result.error).toBeTruthy()
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('deleteNormalizedGame — validação de ID', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({})
  })

  it('retorna erro quando gameId não é UUID válido', async () => {
    const result = await deleteNormalizedGame(INVALID_ID)
    expect(result.error).toBeTruthy()
    expect(result.error).toMatch(/inválido/i)
  })

  it('retorna erro para string vazia', async () => {
    const result = await deleteNormalizedGame('')
    expect(result.error).toBeTruthy()
  })
})

describe('deleteNormalizedGame — sem sessão ativa', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    })
  })

  it('retorna erro quando usuário não está logado', async () => {
    const result = await deleteNormalizedGame(VALID_UUID)
    expect(result.error).toBeTruthy()
  })
})

describe('deleteNormalizedGame — com sessão ativa', () => {
  const fakeUser = { id: 'uid-1' }
  const fakeAuthSession = { user: fakeUser }

  function buildDeleteMock(resolvedValue: { error: unknown }) {
    return {
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue(resolvedValue),
      }),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('chama delete().eq("id", gameId) corretamente', async () => {
    const mockFrom = buildDeleteMock({ error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(mockFrom),
    })

    await deleteNormalizedGame(VALID_UUID)

    expect(mockGetClient().from).toHaveBeenCalledWith('games')
    expect(mockFrom.delete).toHaveBeenCalled()
    expect(mockFrom.delete().eq).toHaveBeenCalledWith('id', VALID_UUID)
  })

  it('retorna { error: null } em caso de sucesso', async () => {
    const mockFrom = buildDeleteMock({ error: null })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(mockFrom),
    })

    const result = await deleteNormalizedGame(VALID_UUID)
    expect(result).toEqual({ error: null })
  })

  it('retorna mensagem amigável quando Supabase retorna erro', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockFrom = buildDeleteMock({ error: { message: 'RLS violation' } })
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: fakeAuthSession } }),
      },
      from: jest.fn().mockReturnValue(mockFrom),
    })

    const result = await deleteNormalizedGame(VALID_UUID)
    expect(result.error).toBeTruthy()
    expect(result.error).toMatch(/não foi possível excluir/i)
    warnSpy.mockRestore()
  })

  it('retorna mensagem amigável sem lançar se getSession lança exceção', async () => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockRejectedValue(new Error('network error')),
      },
    })

    const result = await deleteNormalizedGame(VALID_UUID)
    expect(result.error).toBeTruthy()
  })
})
