jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  listLiveParticipantIdentities: jest.fn(),
}))

import { renderHook, waitFor } from '@testing-library/react'
import { useLiveParticipantIdentities } from '@/modules/auth/hooks/useLiveParticipantIdentities'
import { listLiveParticipantIdentities } from '@/modules/auth/services/profile-avatar.service'

const mockList = listLiveParticipantIdentities as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue([
    { participantClientId: 'p1', profileId: 'u1', avatarUrl: 'avatar.webp' },
  ])
})

it.each([
  ['demo', false],
  ['offline', false],
])('nao busca identidades no modo %s', async (_mode, enabled) => {
  const { result } = renderHook(() => useLiveParticipantIdentities('session-1', enabled))
  expect(result.current.identities).toEqual({})
  expect(mockList).not.toHaveBeenCalled()
})

it('busca identidade somente quando online esta habilitado', async () => {
  const { result } = renderHook(() => useLiveParticipantIdentities('session-1', true))
  await waitFor(() => expect(result.current.identities.p1?.avatarUrl).toBe('avatar.webp'))
  expect(mockList).toHaveBeenCalledWith('session-1')
})
