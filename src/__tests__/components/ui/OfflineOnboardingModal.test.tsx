import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OfflineOnboardingModal } from '@/components/ui/OfflineOnboardingModal'

const setTheme = jest.fn()
let currentTheme = 'light'

jest.mock('@/app/providers/useThemeMode', () => ({
  useThemeMode: () => ({ theme: currentTheme, setTheme }),
}))

describe('OfflineOnboardingModal', () => {
  beforeEach(() => {
    setTheme.mockClear()
    currentTheme = 'light'
  })

  it('inicia com light e preserva a escolha ao concluir para a biblioteca', async () => {
    const user = userEvent.setup()
    const onComplete = jest.fn()
    const onClose = jest.fn()

    render(
      <OfflineOnboardingModal
        isOpen
        onClose={onClose}
        onComplete={onComplete}
      />,
    )

    expect(screen.getByRole('button', { name: /tema claro/i })).toHaveClass(
      'border-[var(--color-primary)]',
    )

    await user.click(screen.getByRole('button', { name: /tema cinema/i }))
    expect(setTheme).toHaveBeenCalledWith('cinema')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.click(screen.getByRole('button', { name: 'Adicionar time' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar time' }))

    const memberInputs = screen.getAllByPlaceholderText('Nome do participante')
    await user.type(memberInputs[0], 'Ana{enter}')
    await user.type(memberInputs[1], 'Bia{enter}')

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Finalizar' }))

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'cinema',
        teams: [
          expect.objectContaining({ members: ['Ana'] }),
          expect.objectContaining({ members: ['Bia'] }),
        ],
      }),
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('inicia com a preferencia explicita atual sem voltar ao default', () => {
    currentTheme = 'matrix'

    render(
      <OfflineOnboardingModal
        isOpen
        onClose={jest.fn()}
        onComplete={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /tema Matrix/i })).toHaveClass(
      'border-[var(--color-primary)]',
    )
  })
})
