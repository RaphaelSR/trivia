jest.mock('@/shared/components/LocalQrCode', () => ({
  LocalQrCode: ({ value }: { value: string }) => <div data-testid="local-qr">{value}</div>,
}))

jest.mock('@/modules/auth/services/live-session-claim.service', () => ({
  getLiveSessionInvite: jest.fn(),
  listLiveSessionParticipants: jest.fn(),
  revokeLiveSessionClaim: jest.fn(),
}))

jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  listLiveParticipantIdentities: jest.fn(),
}))

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LiveSessionInviteModal } from '@/modules/control/components/LiveSessionInviteModal'
import {
  getLiveSessionInvite,
  listLiveSessionParticipants,
  revokeLiveSessionClaim,
} from '@/modules/auth/services/live-session-claim.service'
import { listLiveParticipantIdentities } from '@/modules/auth/services/profile-avatar.service'

const mockGetInvite = getLiveSessionInvite as jest.Mock
const mockList = listLiveSessionParticipants as jest.Mock
const mockRevoke = revokeLiveSessionClaim as jest.Mock
const mockIdentities = listLiveParticipantIdentities as jest.Mock
const TOKEN = '550e8400-e29b-41d4-a716-446655440000'
const URL = `http://localhost:5173/claim?session=${TOKEN}`

beforeEach(() => {
  jest.clearAllMocks()
  mockGetInvite.mockResolvedValue({
    invite: { onlineSessionId: 'online-1', joinToken: TOKEN, url: URL },
    error: null,
  })
  mockList.mockResolvedValue({
    participants: [
      {
        participantClientId: 'a1',
        displayName: 'A1',
        teamName: 'Time A',
        claimed: true,
        claimedByMe: false,
        claimable: false,
        claimId: '550e8400-e29b-41d4-a716-446655440001',
      },
      {
        participantClientId: 'b1',
        displayName: 'B1',
        teamName: 'Time B',
        claimed: false,
        claimedByMe: false,
        claimable: true,
        claimId: null,
      },
    ],
    error: null,
  })
  mockIdentities.mockResolvedValue([
    {
      participantClientId: 'a1',
      profileId: 'profile-a1',
      accountDisplayName: 'Conta A1',
      avatarPath: 'profile-a1/avatar.webp',
      avatarUpdatedAt: '2026-07-16T00:00:00Z',
      avatarUrl: 'https://cdn.test/a1.webp',
    },
  ])
})

it('forca sync antes de buscar QR e lista status', async () => {
  const order: string[] = []
  const prepare = jest.fn().mockImplementation(async () => {
    order.push('sync')
    return true
  })
  mockGetInvite.mockImplementation(async () => {
    order.push('invite')
    return { invite: { onlineSessionId: 'online-1', joinToken: TOKEN, url: URL }, error: null }
  })

  render(
    <LiveSessionInviteModal
      isOpen
      onClose={jest.fn()}
      sessionClientId="session-1"
      onPrepareSync={prepare}
    />,
  )

  expect(await screen.findByTestId('local-qr')).toHaveTextContent(URL)
  expect(screen.getByText('A1', { selector: 'p' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Avatar de A1' })).toHaveAttribute('src', 'https://cdn.test/a1.webp')
  expect(screen.getByText('aguardando')).toBeInTheDocument()
  expect(order).toEqual(['sync', 'invite'])
  expect(mockList).toHaveBeenCalledWith(TOKEN)
})

it('falha de sync oferece retry sem buscar token', async () => {
  render(
    <LiveSessionInviteModal
      isOpen
      onClose={jest.fn()}
      sessionClientId="session-1"
      onPrepareSync={jest.fn().mockResolvedValue(false)}
    />,
  )

  expect(await screen.findByText(/sessão ainda não sincronizou/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  expect(mockGetInvite).not.toHaveBeenCalled()
})

it('desvincula somente depois de confirmação e atualiza a lista', async () => {
  mockRevoke.mockResolvedValue({ revoked: true, error: null })
  render(
    <LiveSessionInviteModal
      isOpen
      onClose={jest.fn()}
      sessionClientId="session-1"
      onPrepareSync={jest.fn().mockResolvedValue(true)}
    />,
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Desvincular A1' }))
  expect(screen.getByText(/ficará registrado/i)).toBeInTheDocument()
  expect(mockRevoke).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }))
  await waitFor(() => {
    expect(mockRevoke).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
  })
})
