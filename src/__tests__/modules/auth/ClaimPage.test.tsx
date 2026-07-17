/**
 * Testes para ClaimPage (/claim?token=..., /claim?game=... e /claim?session=...)
 *
 * Cenários existentes (?token=):
 *  1. Supabase não configurado → "Indisponível"
 *  2. Sem token → "Link inválido"
 *  3. Deslogado → mostra botão para entrar/criar conta
 *  4. Logado → chama claim(token) automaticamente
 *  5. Logado + claim sucesso → "Partida vinculada à sua conta!"
 *  6. Logado + claim erro → mensagem de erro
 *  7. Não chama claim duas vezes (idempotente)
 *
 * Novos cenários (?game=):
 *  8. Deslogado → mostra tela de auth
 *  9. Logado → lista participantes
 * 10. Clicar "Sou eu" → chama claimParticipantByGame e mostra sucesso
 * 11. Participante claimed → botão desabilitado / texto "já vinculado"
 * 12. Erro ALREADY_CLAIMED_IN_GAME → mostra mensagem mapeada
 */

jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}))

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  listClaimableParticipants: jest.fn(),
  claimParticipantByGame: jest.fn(),
}))

jest.mock('@/modules/auth/services/live-session-claim.service', () => ({
  listLiveSessionParticipants: jest.fn(),
  claimLiveSessionParticipant: jest.fn(),
}))

jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/app/providers/useThemeMode', () => ({
  useThemeMode: () => ({ theme: 'light', setTheme: jest.fn() }),
}))

// Mock do AuthPanel para evitar renderização completa
jest.mock('@/modules/auth/components/AuthPanel', () => ({
  AuthPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-panel">
      <button onClick={onClose}>Fechar painel</button>
    </div>
  ),
}))

jest.mock('@/modules/auth/components/ProfileAvatarEditor', () => ({
  ProfileAvatarEditor: ({ name }: { name: string }) => (
    <div data-testid="profile-avatar-editor">Avatar opcional de {name}</div>
  ),
}))

import '@testing-library/jest-dom'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { ClaimPage } from '@/modules/auth/pages/ClaimPage'
import {
  listClaimableParticipants,
  claimParticipantByGame,
} from '@/modules/auth/services/normalized-history.service'
import {
  claimLiveSessionParticipant,
  listLiveSessionParticipants,
} from '@/modules/auth/services/live-session-claim.service'

const mockIsConfigured = isSupabaseConfigured as jest.Mock
const mockUseAuth = useAuth as jest.Mock
const mockListClaimable = listClaimableParticipants as jest.Mock
const mockClaimByGame = claimParticipantByGame as jest.Mock
const mockListLive = listLiveSessionParticipants as jest.Mock
const mockClaimLive = claimLiveSessionParticipant as jest.Mock

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
  mockListLive.mockResolvedValue({ participants: [], error: null })
})

it('mantém o link inicial dentro do basename do GitHub Pages sem duplicá-lo', () => {
  render(
    <MemoryRouter
      basename="/trivia"
      initialEntries={[`/trivia/claim?session=${VALID_TOKEN}`]}
    >
      <Routes>
        <Route path="/claim" element={<ClaimPage />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: /trivia cinematográfico/i })).toHaveAttribute(
    'href',
    '/trivia',
  )
})

describe('ClaimPage — modo ?session= permanente', () => {
  const liveParticipants = [
    {
      participantClientId: 'a1',
      displayName: 'A1',
      teamName: 'Time A',
      claimed: false,
      claimedByMe: false,
      claimable: true,
      claimId: null,
    },
    {
      participantClientId: 'b1',
      displayName: 'B1',
      teamName: 'Time B',
      claimed: true,
      claimedByMe: false,
      claimable: false,
      claimId: 'claim-b1',
    },
    {
      participantClientId: 'c1',
      displayName: 'C1',
      teamName: 'Time C',
      claimed: false,
      claimedByMe: false,
      claimable: false,
      claimId: null,
    },
  ]

  it('preserva o gate de login', () => {
    renderClaimPage(`?session=${VALID_TOKEN}`)
    expect(screen.getByRole('button', { name: /entrar \/ criar conta/i })).toBeInTheDocument()
    expect(mockListLive).not.toHaveBeenCalled()
  })

  it('lista times, diferencia ocupado e reservado', async () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: { id: 'user-1' } })
    mockListLive.mockResolvedValue({ participants: liveParticipants, error: null })

    renderClaimPage(`?session=${VALID_TOKEN}`)

    expect(await screen.findByText('A1')).toBeInTheDocument()
    expect(screen.getByText('Time B')).toBeInTheDocument()
    expect(screen.getByText('vinculado')).toBeInTheDocument()
    expect(screen.getByText('reservado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sou A1' })).toBeEnabled()
  })

  it('reivindica por client id e aceita sucesso ainda durante o jogo', async () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: { id: 'user-1' } })
    mockListLive.mockResolvedValue({ participants: liveParticipants, error: null })
    mockClaimLive.mockResolvedValue({ gameId: null, sessionClientId: 'session-1', error: null })

    renderClaimPage(`?session=${VALID_TOKEN}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Sou A1' }))

    await waitFor(() => {
      expect(mockClaimLive).toHaveBeenCalledWith(VALID_TOKEN, 'a1')
      expect(screen.getByText(/partida vinculada à sua conta/i)).toBeInTheDocument()
      expect(screen.getByTestId('profile-avatar-editor')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /agora não/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /agora não/i }))
    expect(screen.queryByTestId('profile-avatar-editor')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerenciar minha foto/i })).toBeInTheDocument()
  })

  it('reconhece o próprio claim ao reabrir o QR e não pede nova seleção', async () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: { id: 'user-1' } })
    mockListLive.mockResolvedValue({
      participants: liveParticipants.map((participant) =>
        participant.participantClientId === 'a1'
          ? { ...participant, claimed: true, claimedByMe: true, claimable: false }
          : participant,
      ),
      error: null,
    })

    renderClaimPage(`?session=${VALID_TOKEN}`)

    expect(await screen.findByText(/você já está nesta partida/i)).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('Time A')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sou A1' })).not.toBeInTheDocument()
    expect(mockClaimLive).not.toHaveBeenCalled()
    expect(screen.getByTestId('profile-avatar-editor')).toBeInTheDocument()
  })
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

// ── 8-12. Modo ?game= (convite genérico da sessão) ───────────────────────────

const VALID_GAME_TOKEN = '550e8400-e29b-41d4-a716-446655440099'
const VALID_PARTICIPANT_ID = '11112222-3333-4444-5555-666677778888'

function renderClaimGamePage(gameToken: string) {
  return render(
    <MemoryRouter initialEntries={[`/claim?game=${gameToken}`]}>
      <Routes>
        <Route path="/claim" element={<ClaimPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClaimPage — modo ?game= deslogado', () => {
  it('exibe botão de login quando usuário não está autenticado', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: null })
    renderClaimGamePage(VALID_GAME_TOKEN)
    expect(screen.getByRole('button', { name: /entrar \/ criar conta/i })).toBeInTheDocument()
  })

  it('NÃO chama listClaimableParticipants sem login', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: null })
    renderClaimGamePage(VALID_GAME_TOKEN)
    expect(mockListClaimable).not.toHaveBeenCalled()
  })
})

describe('ClaimPage — modo ?game= logado, lista participantes', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }
  const fakeParticipants = [
    { participantId: VALID_PARTICIPANT_ID, displayName: 'Alice', teamName: 'Time A', claimed: false },
    { participantId: '99998888-7777-6666-5555-444433332222', displayName: 'Bob', teamName: 'Time B', claimed: true },
  ]

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: fakeUser })
    mockListClaimable.mockResolvedValue(fakeParticipants)
  })

  it('chama listClaimableParticipants com o game token', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    expect(mockListClaimable).toHaveBeenCalledWith(VALID_GAME_TOKEN)
  })

  it('exibe os nomes dos participantes', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('participante não-claimed tem botão "Sou eu"', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sou alice/i })).toBeInTheDocument()
    })
  })

  it('participante claimed tem texto "já vinculado" e não tem botão', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => {
      expect(screen.getByText(/já vinculado/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /sou bob/i })).not.toBeInTheDocument()
    })
  })
})

describe('ClaimPage — modo ?game= clicar "Sou eu" com sucesso', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }
  const fakeParticipants = [
    { participantId: VALID_PARTICIPANT_ID, displayName: 'Alice', teamName: 'Time A', claimed: false },
  ]

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: fakeUser })
    mockListClaimable.mockResolvedValue(fakeParticipants)
    mockClaimByGame.mockResolvedValue({ gameId: 'game-result-uuid', error: null })
  })

  it('chama claimParticipantByGame com token e participantId corretos', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => screen.getByRole('button', { name: /sou alice/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sou alice/i }))
    })

    expect(mockClaimByGame).toHaveBeenCalledWith(VALID_GAME_TOKEN, VALID_PARTICIPANT_ID)
  })

  it('exibe "Partida vinculada à sua conta!" após sucesso', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => screen.getByRole('button', { name: /sou alice/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sou alice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/partida vinculada à sua conta/i)).toBeInTheDocument()
    })
  })
})

describe('ClaimPage — modo ?game= erro ALREADY_CLAIMED_IN_GAME', () => {
  const fakeUser = { id: 'uid-1', email: 'a@b.com' }
  const fakeParticipants = [
    { participantId: VALID_PARTICIPANT_ID, displayName: 'Alice', teamName: 'Time A', claimed: false },
  ]

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ ...defaultAuthState, user: fakeUser })
    mockListClaimable.mockResolvedValue(fakeParticipants)
    mockClaimByGame.mockResolvedValue({
      gameId: null,
      error: 'Você já reivindicou um participante nesta partida.',
    })
  })

  it('exibe a mensagem de erro mapeada', async () => {
    await act(async () => {
      renderClaimGamePage(VALID_GAME_TOKEN)
    })
    await waitFor(() => screen.getByRole('button', { name: /sou alice/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sou alice/i }))
    })

    await waitFor(() => {
      expect(
        screen.getByText(/você já reivindicou um participante nesta partida/i),
      ).toBeInTheDocument()
    })
  })
})
