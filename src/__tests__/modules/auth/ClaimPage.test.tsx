/**
 * Testes para ClaimPage (/claim?token=...)
 *
 * Cenários:
 *  1. Supabase não configurado → "Indisponível"
 *  2. Sem token → "Link inválido"
 *  3. Deslogado → mostra botão para entrar/criar conta
 *  4. Logado → chama claim(token) automaticamente
 *  5. Logado + claim sucesso → "Partida vinculada à sua conta!"
 *  6. Logado + claim erro → mensagem de erro
 *  7. Não chama claim duas vezes (idempotente)
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Mock do AuthPanel para evitar renderização completa
jest.mock('@/modules/auth/components/AuthPanel', () => ({
  AuthPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-panel">
      <button onClick={onClose}>Fechar painel</button>
    </div>
  ),
}))

// Mock do vite-env para BASE_URL
jest.mock('@/shared/services/vite-env', () => ({
  readViteEnv: jest.fn().mockReturnValue('/'),
}))

import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ClaimPage } from '@/modules/auth/pages/ClaimPage'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockUseAuth = useAuth as jest.Mock

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000'

function renderClaimPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/claim${search}`]}>
      <Routes>
        <Route path="/claim" element={<ClaimPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const defaultAuthState = {
  user: null,
  loading: false,
  configured: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  resend: jest.fn(),
  claim: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsConfigured.mockReturnValue(true)
  mockUseAuth.mockReturnValue(defaultAuthState)
})

// ── 1. Supabase não configurado ───────────────────────────────────────────────

describe('ClaimPage — Supabase não configurado', () => {
  it('exibe mensagem "Indisponível"', () => {
    mockIsConfigured.mockReturnValue(false)
    renderClaimPage(`?token=${VALID_TOKEN}`)
    expect(screen.getByText(/indisponível/i)).toBeInTheDocument()
  })
})

// ── 2. Sem token ──────────────────────────────────────────────────────────────

describe('ClaimPage — sem token', () => {
  it('exibe "Link inválido" quando não há token na URL', () => {
    renderClaimPage()
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument()
  })
})

// ── 3. Deslogado ──────────────────────────────────────────────────────────────

describe('ClaimPage — deslogado', () => {
  it('exibe botão para entrar ou criar conta', () => {
    renderClaimPage(`?token=${VALID_TOKEN}`)
    expect(screen.getByRole('button', { name: /entrar \/ criar conta/i })).toBeInTheDocument()
  })

  it('NÃO chama claim', () => {
    renderClaimPage(`?token=${VALID_TOKEN}`)
    expect(defaultAuthState.claim).not.toHaveBeenCalled()
  })
})

// ── 4 & 5. Logado + sucesso ───────────────────────────────────────────────────

describe('ClaimPage — logado, claim com sucesso', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }

  it('chama claim com o token e exibe mensagem de sucesso', async () => {
    const claimMock = jest.fn().mockResolvedValue({ gameId: 'game-abc', error: null })
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: fakeUser,
      claim: claimMock,
    })

    await act(async () => {
      renderClaimPage(`?token=${VALID_TOKEN}`)
    })

    expect(claimMock).toHaveBeenCalledWith(VALID_TOKEN)

    await waitFor(() => {
      expect(screen.getByText(/partida vinculada à sua conta/i)).toBeInTheDocument()
    })
  })
})

// ── 6. Logado + erro ──────────────────────────────────────────────────────────

describe('ClaimPage — logado, claim com erro', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }

  it('exibe mensagem de erro quando claim falha', async () => {
    const claimMock = jest.fn().mockResolvedValue({
      gameId: null,
      error: 'Link inválido ou já utilizado.',
    })
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: fakeUser,
      claim: claimMock,
    })

    await act(async () => {
      renderClaimPage(`?token=${VALID_TOKEN}`)
    })

    await waitFor(() => {
      expect(screen.getByText(/link inválido ou já utilizado/i)).toBeInTheDocument()
    })
  })
})

// ── 7. Idempotência ───────────────────────────────────────────────────────────

describe('ClaimPage — claim chamado apenas uma vez', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }

  it('não chama claim duas vezes em re-renders', async () => {
    const claimMock = jest.fn().mockResolvedValue({ gameId: 'gid', error: null })
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: fakeUser,
      claim: claimMock,
    })

    const { rerender } = render(
      <MemoryRouter initialEntries={[`/claim?token=${VALID_TOKEN}`]}>
        <Routes>
          <Route path="/claim" element={<ClaimPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(claimMock).toHaveBeenCalledTimes(1))

    // Re-render não deve disparar claim novamente
    await act(async () => {
      rerender(
        <MemoryRouter initialEntries={[`/claim?token=${VALID_TOKEN}`]}>
          <Routes>
            <Route path="/claim" element={<ClaimPage />} />
          </Routes>
        </MemoryRouter>,
      )
    })

    expect(claimMock).toHaveBeenCalledTimes(1)
  })
})
