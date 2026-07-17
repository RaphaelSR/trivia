/**
 * Testes para auth.service.ts
 * Valida que todas as funções são no-op seguros quando Supabase não está configurado.
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

import { isSupabaseConfigured, getSupabaseClient } from '@/shared/services/supabase.client'
import { signUp, signIn, signOut, getSession, onAuthStateChange, requestPasswordReset, resendConfirmation, updatePassword } from '@/modules/auth/services/auth.service'

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
    window.history.replaceState({}, '', '/')
  })

  it('signIn repassa erro genérico quando Supabase retorna erro', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })
    const result = await signIn('a@b.com', 'wrongpass')
    expect(result.user).toBeNull()
    // Mensagem genérica — não revela detalhes do erro original
    expect(result.error).toBe('E-mail ou senha inválidos. Tente novamente.')
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

  it('signUp preserva o convite permanente no retorno da confirmação', async () => {
    window.history.replaceState({}, '', '/claim?session=550e8400-e29b-41d4-a716-446655440000')
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })

    await signUp('a@b.com', 'password123', 'Test')

    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: `${window.location.origin}/claim?session=550e8400-e29b-41d4-a716-446655440000`,
        }),
      }),
    )
  })

  it('preserva o convite permanente sob o BASE_URL do GitHub Pages', async () => {
    process.env.BASE_URL = '/trivia/'
    window.history.replaceState({}, '', '/trivia/claim?session=550e8400-e29b-41d4-a716-446655440000')
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })

    await signUp('a@b.com', 'password123', 'Test')

    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: `${window.location.origin}/trivia/claim?session=550e8400-e29b-41d4-a716-446655440000`,
        }),
      }),
    )
  })

  it('ignora parâmetros de retorno que não sejam tokens de claim válidos', async () => {
    window.history.replaceState({}, '', '/claim?next=https://example.com&session=invalido')
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })

    await signUp('a@b.com', 'password123', 'Test')

    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ emailRedirectTo: `${window.location.origin}/` }),
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

// Garantia explícita do requisito do produto: entrar, criar conta ou sair
// NUNCA pode apagar a sessão local salva no navegador. As funções de auth só
// falam com o Supabase Auth (token sb-*), nunca com as chaves trivia-*.
describe('auth.service — não apaga dados locais existentes', () => {
  const OFFLINE_KEY = 'trivia-active-session'
  const OFFLINE_VALUE = JSON.stringify({ metadata: { id: 'jogo-importante' }, session: {} })

  const mockAuth = {
    signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: {} }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  }

  beforeEach(() => {
    mockIsConfigured.mockReturnValue(true)
    mockGetClient.mockReturnValue({ auth: mockAuth })
    localStorage.setItem(OFFLINE_KEY, OFFLINE_VALUE)
  })

  afterEach(() => localStorage.removeItem(OFFLINE_KEY))

  it('signIn preserva a sessão local no localStorage', async () => {
    await signIn('a@b.com', 'password123')
    expect(localStorage.getItem(OFFLINE_KEY)).toBe(OFFLINE_VALUE)
  })

  it('signUp preserva a sessão local no localStorage', async () => {
    await signUp('a@b.com', 'password123', 'Nome')
    expect(localStorage.getItem(OFFLINE_KEY)).toBe(OFFLINE_VALUE)
  })

  it('signOut preserva a sessão local no localStorage', async () => {
    await signOut()
    expect(localStorage.getItem(OFFLINE_KEY)).toBe(OFFLINE_VALUE)
  })
})

describe('auth.service — redefinição de senha', () => {
  it('requestPasswordReset é no-op (error: null) sem configuração', async () => {
    mockIsConfigured.mockReturnValue(false)
    expect(await requestPasswordReset('a@b.com')).toEqual({ error: null })
  })

  it('updatePassword é no-op (error: null) sem configuração', async () => {
    mockIsConfigured.mockReturnValue(false)
    expect(await updatePassword('novaSenha123')).toEqual({ error: null })
  })

  it('requestPasswordReset chama resetPasswordForEmail com redirectTo do app', async () => {
    mockIsConfigured.mockReturnValue(true)
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ data: {}, error: null })
    mockGetClient.mockReturnValue({ auth: { resetPasswordForEmail } })

    const result = await requestPasswordReset('a@b.com')

    expect(result).toEqual({ error: null })
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: window.location.origin + '/',
    })
  })

  it('requestPasswordReset retorna mensagem genérica em pt-BR quando falha', async () => {
    mockIsConfigured.mockReturnValue(true)
    const resetPasswordForEmail = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'smtp indisponivel' } })
    mockGetClient.mockReturnValue({ auth: { resetPasswordForEmail } })

    const result = await requestPasswordReset('a@b.com')

    expect(result.error).toMatch(/Não foi possível enviar/)
    expect(result.error).not.toContain('smtp')
  })

  it('updatePassword chama auth.updateUser com a nova senha', async () => {
    mockIsConfigured.mockReturnValue(true)
    const updateUser = jest.fn().mockResolvedValue({ data: {}, error: null })
    mockGetClient.mockReturnValue({ auth: { updateUser } })

    expect(await updatePassword('novaSenha123')).toEqual({ error: null })
    expect(updateUser).toHaveBeenCalledWith({ password: 'novaSenha123' })
  })

  it('updatePassword retorna mensagem genérica quando falha', async () => {
    mockIsConfigured.mockReturnValue(true)
    const updateUser = jest.fn().mockResolvedValue({ data: null, error: { message: 'weak' } })
    mockGetClient.mockReturnValue({ auth: { updateUser } })

    const result = await updatePassword('novaSenha123')
    expect(result.error).toMatch(/Não foi possível atualizar/)
  })
})
