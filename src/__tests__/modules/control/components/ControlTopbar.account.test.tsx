/**
 * Testes para o botão de conta e ícones de modo no ControlTopbar.
 *
 * Cenários:
 *  A) Botão de conta:
 *   1. Renderiza o botão "Minha conta" quando onOpenAccount é passado
 *   2. NÃO renderiza o botão quando onOpenAccount não é passado (undefined)
 *   3. Chama onOpenAccount ao clicar no botão
 *
 *  C) Ícone de modo:
 *   4. Modo offline usa ícone HardDrive (data-testid="mode-icon-offline"), não WifiOff
 *   5. Modo online usa ícone Cloud (data-testid="mode-icon-online"), não Wifi
 *   6. Modo demo usa ícone MonitorPlay (data-testid="mode-icon-demo")
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlTopbar } from '@/modules/control/ui/ControlTopbar'

const baseProps = {
  title: 'Sessão de Teste',
  modeLabel: 'Partida completa',
  mode: 'offline' as const,
  onOpenSessions: jest.fn(),
  onExit: jest.fn(),
  onToggleSidebar: jest.fn(),
}

describe('ControlTopbar — botão de conta (item A)', () => {
  it('renderiza o botão "Minha conta" quando onOpenAccount é fornecido', () => {
    const onOpenAccount = jest.fn()
    render(<ControlTopbar {...baseProps} onOpenAccount={onOpenAccount} />)
    expect(screen.getByRole('button', { name: /minha conta/i })).toBeInTheDocument()
  })

  it('NÃO renderiza o botão de conta quando onOpenAccount é undefined', () => {
    render(<ControlTopbar {...baseProps} />)
    expect(screen.queryByRole('button', { name: /minha conta/i })).not.toBeInTheDocument()
  })

  it('chama onOpenAccount ao clicar no botão de conta', () => {
    const onOpenAccount = jest.fn()
    render(<ControlTopbar {...baseProps} onOpenAccount={onOpenAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /minha conta/i }))
    expect(onOpenAccount).toHaveBeenCalledTimes(1)
  })

  it('mostra a foto da conta quando o perfil possui avatar', () => {
    render(
      <ControlTopbar
        {...baseProps}
        onOpenAccount={jest.fn()}
        accountName="Raphael Rocha"
        accountAvatarUrl="https://cdn.test/raphael.webp"
      />,
    )

    expect(screen.getByRole('img', { name: /raphael rocha/i })).toHaveAttribute(
      'src',
      'https://cdn.test/raphael.webp',
    )
  })

  it('usa iniciais quando a conta está logada mas não possui foto', () => {
    render(
      <ControlTopbar
        {...baseProps}
        onOpenAccount={jest.fn()}
        accountName="Raphael Rocha"
      />,
    )

    expect(screen.getByRole('img', { name: /iniciais.*raphael rocha/i })).toHaveTextContent('RR')
  })
})

describe('ControlTopbar — ícone de modo (item C)', () => {
  it('modo offline usa HardDrive (data-testid="mode-icon-offline"), não WifiOff', () => {
    render(<ControlTopbar {...baseProps} mode="offline" modeLabel="Partida completa" />)
    const icon = document.querySelector('[data-testid="mode-icon-offline"]')
    expect(icon).toBeInTheDocument()
  })

  it('modo online usa Cloud (data-testid="mode-icon-online"), não Wifi', () => {
    render(
      <ControlTopbar
        {...baseProps}
        mode="online"
        modeLabel="Partida completa"
        syncStatus="synced"
      />,
    )
    const icon = document.querySelector('[data-testid="mode-icon-online"]')
    expect(icon).toBeInTheDocument()
  })

  it('modo demo usa MonitorPlay (data-testid="mode-icon-demo")', () => {
    render(<ControlTopbar {...baseProps} mode="demo" modeLabel="Demo" />)
    const icon = document.querySelector('[data-testid="mode-icon-demo"]')
    expect(icon).toBeInTheDocument()
  })
})
