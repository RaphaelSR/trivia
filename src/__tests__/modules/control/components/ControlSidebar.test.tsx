import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { ControlSidebar } from '@/modules/control/ui/ControlSidebar'

describe('ControlSidebar', () => {
  const baseProps = {
    collapsed: false,
    onToggleCollapsed: jest.fn(),
    title: 'Trivia de sábado',
    children: <button type="button">Tema</button>,
  }

  it('mantém o painel desktop oculto no mobile e abre um drawer funcional', () => {
    const onCloseMobile = jest.fn()
    const { container } = render(
      <ControlSidebar
        {...baseProps}
        mobileOpen
        onCloseMobile={onCloseMobile}
      />,
    )

    expect(container.querySelector('aside')).toHaveClass('hidden', 'xl:flex')
    expect(screen.getByRole('button', { name: 'Fechar menu lateral' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Tema' })).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu lateral' }))
    expect(onCloseMobile).toHaveBeenCalledTimes(1)
  })

  it('não monta o drawer mobile enquanto estiver fechado', () => {
    render(
      <ControlSidebar
        {...baseProps}
        mobileOpen={false}
        onCloseMobile={jest.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Fechar menu lateral' })).not.toBeInTheDocument()
  })
})
