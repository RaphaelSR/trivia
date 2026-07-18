jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  getMyProfileIdentity: jest.fn(),
}))

import { act, renderHook, waitFor } from '@testing-library/react'
import { useMyProfileIdentity } from '@/modules/auth/hooks/useMyProfileIdentity'
import { getMyProfileIdentity } from '@/modules/auth/services/profile-avatar.service'

const getMyProfileIdentityMock = getMyProfileIdentity as jest.MockedFunction<typeof getMyProfileIdentity>

describe('useMyProfileIdentity', () => {
  beforeEach(() => jest.clearAllMocks())

  it('não consulta perfil sem usuário autenticado', () => {
    const { result } = renderHook(() => useMyProfileIdentity(null))
    expect(result.current.identity).toBeNull()
    expect(getMyProfileIdentityMock).not.toHaveBeenCalled()
  })

  it('não consulta perfil quando a capacidade está desabilitada, como no demo', () => {
    const { result } = renderHook(() => useMyProfileIdentity('u1', false))
    expect(result.current.identity).toBeNull()
    expect(getMyProfileIdentityMock).not.toHaveBeenCalled()
  })

  it('carrega e aceita atualização imediata após troca de avatar', async () => {
    getMyProfileIdentityMock.mockResolvedValue({
      profileId: 'u1',
      accountDisplayName: 'Ana',
      avatarPath: 'u1/a.webp',
      avatarUpdatedAt: '2026-07-17T12:00:00Z',
      avatarUrl: 'https://cdn.test/a.webp',
    })

    const { result } = renderHook(() => useMyProfileIdentity('u1'))
    await waitFor(() => expect(result.current.identity?.avatarUrl).toBe('https://cdn.test/a.webp'))

    act(() => {
      result.current.setIdentity({ ...result.current.identity!, avatarUrl: 'https://cdn.test/b.webp' })
    })
    expect(result.current.identity?.avatarUrl).toBe('https://cdn.test/b.webp')
  })
})
