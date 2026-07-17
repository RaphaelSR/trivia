/**
 * Testes para useAuth
 *
 * Cenários novos:
 *  - linkMyParticipations é chamado (fire-and-forget) quando user aparece
 *    no getSession inicial e no onAuthStateChange.
 *  - claim(token) delega para claimParticipation e retorna resultado.
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

jest.mock('@/modules/auth/services/auth.service', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resendConfirmation: jest.fn(),
}))

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  linkMyParticipations: jest.fn(),
  claimParticipation: jest.fn(),
}))

import { renderHook, act, waitFor } from '@testing-library/react'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import {
  getSession,
  onAuthStateChange,
} from '@/modules/auth/services/auth.service'
import {
  linkMyParticipations,
  claimParticipation,
} from '@/modules/auth/services/normalized-history.service'
import { useAuth } from '@/modules/auth/hooks/useAuth'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockGetSession = getSession as jest.Mock
const mockOnAuthStateChange = onAuthStateChange as jest.Mock
const mockLinkMyParticipations = linkMyParticipations as jest.Mock
const mockClaimParticipation = claimParticipation as jest.Mock

const fakeUser = { id: 'user-1', email: 'a@b.com' }

beforeEach(() => {
  jest.clearAllMocks()
  mockIsConfigured.mockReturnValue(true)
  mockOnAuthStateChange.mockReturnValue(() => undefined)
})

// ── linkMyParticipations fire-and-forget ──────────────────────────────────────

describe('useAuth — linkMyParticipations chamado quando user aparece', () => {
  it('chama linkMyParticipations quando getSession retorna user', async () => {
    mockGetSession.mockResolvedValue({ user: fakeUser })
    mockLinkMyParticipations.mockResolvedValue(0)

    renderHook(() => useAuth())

    await waitFor(() => {
      expect(mockLinkMyParticipations).toHaveBeenCalled()
    })
  })

  it('NÃO chama linkMyParticipations quando getSession retorna null', async () => {
    mockGetSession.mockResolvedValue(null)
    mockLinkMyParticipations.mockResolvedValue(0)

    renderHook(() => useAuth())

    // Aguarda o hook estabilizar
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })

    expect(mockLinkMyParticipations).not.toHaveBeenCalled()
  })

  it('chama linkMyParticipations quando onAuthStateChange dispara com user', async () => {
    mockGetSession.mockResolvedValue(null)
    mockLinkMyParticipations.mockResolvedValue(2)

    let authCallback: ((event: string, session: { user: typeof fakeUser } | null) => void) | null = null
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb
      return () => undefined
    })

    renderHook(() => useAuth())

    // Aguarda o setup inicial
    await waitFor(() => expect(mockGetSession).toHaveBeenCalled())

    // Simula evento de login via onAuthStateChange. A RPC NÃO começa dentro
    // do callback; ela é adiada para evitar o deadlock documentado do Supabase.
    act(() => {
      authCallback?.('SIGNED_IN', { user: fakeUser })
    })
    expect(mockLinkMyParticipations).not.toHaveBeenCalled()

    await waitFor(() => expect(mockLinkMyParticipations).toHaveBeenCalled())
  })

  it('não lança se linkMyParticipations rejeitar', async () => {
    mockGetSession.mockResolvedValue({ user: fakeUser })
    mockLinkMyParticipations.mockRejectedValue(new Error('network error'))

    // Não deve lançar — é fire-and-forget
    await expect(async () => {
      renderHook(() => useAuth())
      await waitFor(() => expect(mockGetSession).toHaveBeenCalled())
      // Aguarda um tick para a promise rejeitar sem propagar
      await new Promise((r) => setTimeout(r, 50))
    }).not.toThrow()
  })
})

// ── claim ─────────────────────────────────────────────────────────────────────

describe('useAuth — claim(token)', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(null)
    mockLinkMyParticipations.mockResolvedValue(0)
  })

  it('delega para claimParticipation e retorna gameId em caso de sucesso', async () => {
    const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
    mockClaimParticipation.mockResolvedValue({ gameId: 'game-abc', error: null })

    const { result } = renderHook(() => useAuth())

    let claimResult: { gameId: string | null; error: string | null } | undefined
    await act(async () => {
      claimResult = await result.current.claim(VALID_UUID)
    })

    expect(mockClaimParticipation).toHaveBeenCalledWith(VALID_UUID)
    expect(claimResult?.gameId).toBe('game-abc')
    expect(claimResult?.error).toBeNull()
  })

  it('retorna erro quando claimParticipation falha', async () => {
    mockClaimParticipation.mockResolvedValue({ gameId: null, error: 'Link inválido ou já utilizado.' })

    const { result } = renderHook(() => useAuth())

    let claimResult: { gameId: string | null; error: string | null } | undefined
    await act(async () => {
      claimResult = await result.current.claim('bad-token')
    })

    expect(claimResult?.gameId).toBeNull()
    expect(claimResult?.error).toBeTruthy()
  })
})
