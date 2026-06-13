/**
 * Testes para DeleteGameDialog
 *
 * Cenários:
 *  1. Senha errada: verifyPassword retorna false → exibe "Senha incorreta." e NÃO chama delete
 *  2. Senha correta: verifyPassword retorna true → chama deleteNormalizedGame e fecha/onSuccess
 *  3. Erro do delete: exibe mensagem de erro
 *  4. Campo vazio: botão Excluir fica desabilitado (disabled)
 *  5. Botão Cancelar chama onClose
 */

jest.mock('@/modules/auth/services/auth.service', () => ({
  verifyPassword: jest.fn(),
}))

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  deleteNormalizedGame: jest.fn(),
}))

import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DeleteGameDialog } from '@/modules/auth/components/DeleteGameDialog'
import { verifyPassword } from '@/modules/auth/services/auth.service'
import { deleteNormalizedGame } from '@/modules/auth/services/normalized-history.service'

const mockVerifyPassword = verifyPassword as jest.Mock
const mockDeleteNormalizedGame = deleteNormalizedGame as jest.Mock

const GAME_ID = '12345678-1234-1234-1234-123456789abc'
const GAME_TITLE = 'Copa Trivia 2026'

function setup(overrides?: { onClose?: jest.Mock; onSuccess?: jest.Mock }) {
  const onClose = overrides?.onClose ?? jest.fn()
  const onSuccess = overrides?.onSuccess ?? jest.fn()
  render(
    <DeleteGameDialog
      gameId={GAME_ID}
      gameTitle={GAME_TITLE}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
  return { onClose, onSuccess }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DeleteGameDialog', () => {
  it('exibe o título do jogo no diálogo', () => {
    setup()
    expect(screen.getByText(GAME_TITLE)).toBeInTheDocument()
  })

  it('botão Excluir fica desabilitado quando o campo de senha está vazio', () => {
    setup()
    const excluirBtn = screen.getByRole('button', { name: /excluir/i })
    expect(excluirBtn).toBeDisabled()
  })

  it('botão Cancelar chama onClose', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('senha errada: exibe "Senha incorreta." e NÃO chama deleteNormalizedGame', async () => {
    mockVerifyPassword.mockResolvedValue(false)
    setup()

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senhaErrada' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Senha incorreta.')
    expect(mockDeleteNormalizedGame).not.toHaveBeenCalled()
  })

  it('senha correta: chama deleteNormalizedGame com gameId e dispara onSuccess', async () => {
    mockVerifyPassword.mockResolvedValue(true)
    mockDeleteNormalizedGame.mockResolvedValue({ error: null })
    const { onSuccess } = setup()

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senhaCorreta' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    })

    expect(mockDeleteNormalizedGame).toHaveBeenCalledWith(GAME_ID)
    expect(onSuccess).toHaveBeenCalled()
  })

  it('erro do delete: exibe mensagem de erro e NÃO chama onSuccess', async () => {
    mockVerifyPassword.mockResolvedValue(true)
    mockDeleteNormalizedGame.mockResolvedValue({ error: 'Não foi possível excluir a partida. Tente novamente.' })
    const { onSuccess } = setup()

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senhaCorreta' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível excluir/i)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('overlay: clicar fora do card chama onClose', () => {
    const { onClose } = setup()
    // O overlay é o div pai com fixed inset-0
    const overlay = document.querySelector('[class*="fixed inset-0"]')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
