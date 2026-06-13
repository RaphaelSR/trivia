/**
 * Testes para verifyPassword em auth.service.ts
 *
 * Cenários:
 *  1. No-op (false) quando Supabase não está configurado
 *  2. No-op (false) quando não há sessão ativa
 *  3. Chama signInWithPassword com o email do usuário atual
 *  4. Retorna true quando sem erro
 *  5. Retorna false quando há erro (senha incorreta)
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { verifyPassword } from '@/modules/auth/services/auth.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

describe('verifyPassword — sem configuração', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('retorna false sem chamar Supabase', async () => {
    const result = await verifyPassword('qualquersenha')
    expect(result).toBe(false)
    expect(mockGetClient).not.toHaveBeenCalled()
  })
})

describe('verifyPassword — sem sessão ativa', () => {
  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    signInWithPassword: jest.fn(),
  }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    jest.clearAllMocks()
    mockAuth.getSession.mockResolvedValue({ data: { session: null } })
  })

  it('retorna false quando não há sessão', async () => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    const result = await verifyPassword('qualquersenha')
    expect(result).toBe(false)
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('verifyPassword — com sessão ativa', () => {
  const fakeUser = { id: 'uid-1', email: 'teste@example.com' }
  const fakeSession = { user: fakeUser }
  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession } }),
    signInWithPassword: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } })
  })

  it('chama signInWithPassword com o email da sessão atual', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })
    await verifyPassword('minhasenha')
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teste@example.com',
      password: 'minhasenha',
    })
  })

  it('retorna true quando signInWithPassword não retorna erro', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })
    const result = await verifyPassword('senhaCorreta')
    expect(result).toBe(true)
  })

  it('retorna false quando signInWithPassword retorna erro (senha incorreta)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    const result = await verifyPassword('senhaErrada')
    expect(result).toBe(false)
  })

  it('retorna false e não lança se getSession lançar exceção', async () => {
    mockAuth.getSession.mockRejectedValue(new Error('network error'))
    const result = await verifyPassword('qualquer')
    expect(result).toBe(false)
  })
})
