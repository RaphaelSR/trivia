jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  getMyProfileIdentity: jest.fn(),
  uploadProfileAvatar: jest.fn(),
  removeProfileAvatar: jest.fn(),
}))

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileAvatarEditor } from '@/modules/auth/components/ProfileAvatarEditor'
import {
  getMyProfileIdentity,
  removeProfileAvatar,
  uploadProfileAvatar,
} from '@/modules/auth/services/profile-avatar.service'

const mockGet = getMyProfileIdentity as jest.Mock
const mockUpload = uploadProfileAvatar as jest.Mock
const mockRemove = removeProfileAvatar as jest.Mock

const withoutAvatar = {
  profileId: 'u1',
  accountDisplayName: 'Ana',
  avatarPath: null,
  avatarUpdatedAt: null,
  avatarUrl: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(withoutAvatar)
})

it('oferece upload opcional e atualiza preview', async () => {
  mockUpload.mockResolvedValue({
    identity: {
      ...withoutAvatar,
      avatarPath: 'u1/avatar.webp',
      avatarUpdatedAt: '2026-07-16T00:00:00Z',
      avatarUrl: 'https://cdn.test/avatar.webp',
    },
    error: null,
  })
  render(<ProfileAvatarEditor name="Ana" variant="claim" />)

  await screen.findByRole('button', { name: /adicionar foto/i })
  const file = new File(['image'], 'nome-original.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Selecionar avatar'), { target: { files: [file] } })

  await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file))
  expect(await screen.findByRole('img', { name: 'Avatar de Ana' })).toHaveAttribute(
    'src',
    'https://cdn.test/avatar.webp',
  )
  expect(screen.getByRole('button', { name: /trocar foto/i })).toBeInTheDocument()
})

it('mantem o avatar visivel quando upload falha e permite remover', async () => {
  const current = {
    ...withoutAvatar,
    avatarPath: 'u1/current.webp',
    avatarUpdatedAt: '2026-07-16T00:00:00Z',
    avatarUrl: 'https://cdn.test/current.webp',
  }
  mockGet.mockResolvedValue(current)
  mockUpload.mockResolvedValue({ identity: current, error: 'Falha temporária.' })
  mockRemove.mockResolvedValue({ identity: withoutAvatar, error: null })
  render(<ProfileAvatarEditor name="Ana" />)

  await screen.findByRole('img', { name: 'Avatar de Ana' })
  fireEvent.change(screen.getByLabelText('Selecionar avatar'), {
    target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] },
  })
  expect(await screen.findByText('Falha temporária.')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Avatar de Ana' })).toHaveAttribute(
    'src',
    'https://cdn.test/current.webp',
  )

  fireEvent.click(screen.getByRole('button', { name: /remover/i }))
  await waitFor(() => expect(mockRemove).toHaveBeenCalled())
  expect(screen.getByRole('img', { name: 'Iniciais de Ana' })).toBeInTheDocument()
})
