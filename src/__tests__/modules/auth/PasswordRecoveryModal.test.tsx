/**
 * Testes do PasswordRecoveryModal — o modal só aparece no evento
 * PASSWORD_RECOVERY e valida/salva a nova senha via updatePassword.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'

jest.mock('@/modules/auth/services/auth.service', () => ({
  onAuthStateChange: jest.fn(),
  updatePassword: jest.fn(),
}))

import { onAuthStateChange, updatePassword } from '@/modules/auth/services/auth.service'
import { PasswordRecoveryModal } from '@/modules/auth/components/PasswordRecoveryModal'

const mockOnAuthStateChange = onAuthStateChange as jest.Mock
const mockUpdatePassword = updatePassword as jest.Mock

type AuthCallback = (event: string, session: unknown) => void

function renderWithCapturedCallback() {
  let callback: AuthCallback = () => {}
  mockOnAuthStateChange.mockImplementation((cb: AuthCallback) => {
    callback = cb
    return () => {}
  })
  render(<PasswordRecoveryModal />)
  return { fireAuthEvent: (event: string) => act(() => callback(event, null)) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdatePassword.mockResolvedValue({ error: null })
})

describe('PasswordRecoveryModal', () => {
  it('não renderiza nada por padrão', () => {
    renderWithCapturedCallback()
    expect(screen.queryByText('Definir nova senha')).not.toBeInTheDocument()
  })

  it('abre no evento PASSWORD_RECOVERY', () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')
    expect(screen.getByText('Definir nova senha')).toBeInTheDocument()
  })

  it('ignora outros eventos de auth (SIGNED_IN etc.)', () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('SIGNED_IN')
    expect(screen.queryByText('Definir nova senha')).not.toBeInTheDocument()
  })

  it('valida tamanho mínimo da senha', async () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'curta' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'curta' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    })

    expect(screen.getByText(/pelo menos 8 caracteres/)).toBeInTheDocument()
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('valida que as senhas coincidem', async () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senhaLonga1' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'senhaLonga2' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    })

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it('salva a nova senha e fecha o modal', async () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senhaLonga1' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'senhaLonga1' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    })

    expect(mockUpdatePassword).toHaveBeenCalledWith('senhaLonga1')
    expect(screen.queryByText('Definir nova senha')).not.toBeInTheDocument()
  })

  it('mostra o erro do serviço e mantém o modal aberto', async () => {
    mockUpdatePassword.mockResolvedValue({ error: 'Não foi possível atualizar a senha. Tente novamente.' })
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senhaLonga1' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'senhaLonga1' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))
    })

    expect(screen.getByText(/Não foi possível atualizar/)).toBeInTheDocument()
    expect(screen.getByText('Definir nova senha')).toBeInTheDocument()
  })

  it('"Deixar para depois" fecha sem salvar', async () => {
    const { fireAuthEvent } = renderWithCapturedCallback()
    fireAuthEvent('PASSWORD_RECOVERY')

    fireEvent.click(screen.getByRole('button', { name: 'Deixar para depois' }))

    expect(screen.queryByText('Definir nova senha')).not.toBeInTheDocument()
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })
})
