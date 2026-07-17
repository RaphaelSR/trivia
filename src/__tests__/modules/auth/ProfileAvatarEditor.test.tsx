jest.mock('@/modules/auth/services/profile-avatar.service', () => ({
  getMyProfileIdentity: jest.fn(),
  prepareAvatarImage: jest.fn(),
  uploadPreparedAvatar: jest.fn(),
  validateAvatarFile: jest.fn(),
  removeProfileAvatar: jest.fn(),
}))

jest.mock('@/modules/auth/components/AvatarCropModal', () => ({
  AvatarCropModal: ({ onConfirm, onCancel, error }: {
    onConfirm: (crop: { zoom: number; focusX: number; focusY: number }) => void
    onCancel: () => void
    error?: string | null
  }) => (
    <div role="dialog" aria-label="Ajustar foto">
      {error ? <p>{error}</p> : null}
      <button onClick={() => onConfirm({ zoom: 1.5, focusX: 0.4, focusY: 0.6 })}>
        Confirmar recorte
      </button>
      <button onClick={onCancel}>Cancelar recorte</button>
    </div>
  ),
}))

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileAvatarEditor } from '@/modules/auth/components/ProfileAvatarEditor'
import {
  getMyProfileIdentity,
  prepareAvatarImage,
  removeProfileAvatar,
  uploadPreparedAvatar,
  validateAvatarFile,
} from '@/modules/auth/services/profile-avatar.service'

const mockGet = getMyProfileIdentity as jest.Mock
const mockPrepare = prepareAvatarImage as jest.Mock
const mockUpload = uploadPreparedAvatar as jest.Mock
const mockValidate = validateAvatarFile as jest.Mock
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
  mockValidate.mockReturnValue(null)
  mockPrepare.mockResolvedValue(new Blob(['processed'], { type: 'image/webp' }))
})

it('abre o ajuste, processa o recorte escolhido e atualiza o preview', async () => {
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
  expect(screen.getByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recorte' }))

  await waitFor(() => expect(mockPrepare).toHaveBeenCalledWith(file, {
    zoom: 1.5,
    focusX: 0.4,
    focusY: 0.6,
  }))
  expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/webp' }))
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
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recorte' }))
  expect(await screen.findByText('Falha temporária.')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Avatar de Ana' })).toHaveAttribute(
    'src',
    'https://cdn.test/current.webp',
  )

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar recorte' }))

  fireEvent.click(screen.getByRole('button', { name: /remover/i }))
  await waitFor(() => expect(mockRemove).toHaveBeenCalled())
  expect(screen.getByRole('img', { name: 'Iniciais de Ana' })).toBeInTheDocument()
})

it('rejeita arquivo invalido antes de abrir o recorte', async () => {
  mockValidate.mockReturnValue('Use uma imagem válida.')
  render(<ProfileAvatarEditor name="Ana" />)

  await screen.findByRole('button', { name: /adicionar foto/i })
  const file = new File(['gif'], 'avatar.gif', { type: 'image/gif' })
  fireEvent.change(screen.getByLabelText('Selecionar avatar'), { target: { files: [file] } })

  expect(screen.queryByRole('dialog', { name: 'Ajustar foto' })).not.toBeInTheDocument()
  expect(screen.getByText('Use uma imagem válida.')).toBeInTheDocument()
  expect(mockPrepare).not.toHaveBeenCalled()
  expect(mockUpload).not.toHaveBeenCalled()
})
