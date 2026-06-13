/**
 * Testes para auth.service.ts
 * Valida que todas as funções são no-op seguros quando Supabase não está configurado.
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { signUp, signIn, signOut, getSession, onAuthStateChange, resendConfirmation } from '@/modules/auth/services/auth.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetClient = getSupabaseClient as jest.Mock

describe('auth.service — sem configuração (no-op)', () => {
  beforeEach(() => {
    mockIsConfigured.mockReturnValue(false)
    mockGetClient.mockReturnValue(null)
  })

  it('signUp retorna {user: null, error: null}', async () => {
    const result = await signUp('a@b.com', 'password123', 'Test')
    expect(result).toEqual({ user: null, error: null })
  })

  it('signIn retorna {user: null, error: null}', async () => {
    const result = await signIn('a@b.com', 'password123')
    expect(result).toEqual({ user: null, error: null })
  })

  it('signOut resolve sem erros', async () => {
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('getSession retorna null', async () => {
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('onAuthStateChange retorna função de cancelamento sem erros', () => {
    const unsubscribe = onAuthStateChange(() => undefined)
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })

  it('resendConfirmation retorna {error: null} (no-op sem config)', async () => {
    const result = await resendConfirmation('a@b.com')
    expect(result).toEqual({ error: null })
  })
})

describe('auth.service — com configuração', () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    resend: jest.fn(),
  }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    jest.clearAllMocks()
    // BASE_URL via process.env (stub do vite-env.jest.ts)
    process.env.BASE_URL = '/'
  })

  afterEach(() => {
    delete process.env.BASE_URL
  })

  it('signIn repassa erro genérico quando Supabase retorna erro', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })
    const result = await signIn('a@b.com', 'wrongpass')
    expect(result.user).toBeNull()
    // Mensagem genérica — não revela detalhes do erro original
    expect(result.error).toBe('Email ou senha inválidos. Tente novamente.')
  })

  it('signIn retorna user quando login tem sucesso', async () => {
    const fakeUser = { id: 'uid-1', email: 'a@b.com' }
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: fakeUser, session: {} },
      error: null,
    })
    const result = await signIn('a@b.com', 'correctpass')
    expect(result.user).toEqual(fakeUser)
    expect(result.error).toBeNull()
  })

  it('signUp repassa mensagem de erro do Supabase', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const result = await signUp('a@b.com', 'password123', 'Test')
    expect(result.user).toBeNull()
    expect(result.error).toBe('User already registered')
  })

  it('signUp inclui emailRedirectTo com origin + BASE_URL', async () => {
    // No jsdom, window.location.origin é 'http://localhost' por padrão
    const expectedRedirect = window.location.origin + '/'
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })
    await signUp('a@b.com', 'password123', 'Test')
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expectedRedirect,
        }),
      }),
    )
  })

  it('signUp inclui emailRedirectTo com base /trivia/ em prod', async () => {
    process.env.BASE_URL = '/trivia/'
    const expectedRedirect = window.location.origin + '/trivia/'
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })
    await signUp('a@b.com', 'password123', 'Test')
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expectedRedirect,
        }),
      }),
    )
  })

  it('resendConfirmation retorna {error: null} em caso de sucesso', async () => {
    const expectedRedirect = window.location.origin + '/'
    mockAuth.resend.mockResolvedValue({ error: null })
    const result = await resendConfirmation('a@b.com')
    expect(result).toEqual({ error: null })
    expect(mockAuth.resend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signup',
        email: 'a@b.com',
        options: expect.objectContaining({ emailRedirectTo: expectedRedirect }),
      }),
    )
  })

  it('resendConfirmation retorna mensagem genérica em pt-BR em caso de erro', async () => {
    mockAuth.resend.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } })
    const result = await resendConfirmation('a@b.com')
    expect(result.error).toBe('Não foi possível reenviar. Tente novamente em instantes.')
  })

  it('onAuthStateChange registra callback e retorna unsubscribe', () => {
    const mockUnsubscribe = jest.fn()
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
    const cb = jest.fn()
    const unsubscribe = onAuthStateChange(cb)
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledWith(cb)
    unsubscribe()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
