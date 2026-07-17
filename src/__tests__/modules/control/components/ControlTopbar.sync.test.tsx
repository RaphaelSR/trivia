/**
 * Testes de gate do SyncStatusIndicator em ControlTopbar.
 *
 * Garante:
 *  - O indicador NÃO aparece quando syncStatus não é passado (modo demo)
 *  - O indicador aparece em modo offline e online com o texto correto
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { ControlTopbar } from '@/modules/control/ui/ControlTopbar'

const baseProps = {
  title: 'Sessão de Teste',
  modeLabel: 'Partida completa',
  mode: 'offline' as const,
  onOpenSessions: jest.fn(),
  onExit: jest.fn(),
  onToggleSidebar: jest.fn(),
}

describe('ControlTopbar — SyncStatusIndicator gate', () => {
  it('não renderiza o indicador quando syncStatus não é passado (demo)', () => {
    render(<ControlTopbar {...baseProps} mode="demo" modeLabel="Demo" />)
    // Nenhum dos textos de sync deve aparecer
    expect(screen.queryByText('Salvo neste navegador')).not.toBeInTheDocument()
    expect(screen.queryByText('Salvando…')).not.toBeInTheDocument()
    expect(screen.queryByText('Salvo na sua conta')).not.toBeInTheDocument()
  })

  it('renderiza o indicador com "Salvo neste navegador" em modo offline (deslogado)', () => {
    render(<ControlTopbar {...baseProps} mode="offline" syncStatus="local-only" />)
    expect(screen.getByText('Salvo neste navegador')).toBeInTheDocument()
  })

  it('renderiza o indicador com "Salvo na sua conta" em modo online (sincronizado)', () => {
    render(<ControlTopbar {...baseProps} mode="online" modeLabel="Partida completa" syncStatus="synced" />)
    expect(screen.getByText('Salvo na sua conta')).toBeInTheDocument()
  })

  it('renderiza o indicador com "Salvando…" em modo online (sincronizando)', () => {
    render(<ControlTopbar {...baseProps} mode="online" modeLabel="Partida completa" syncStatus="syncing" />)
    expect(screen.getByText('Salvando…')).toBeInTheDocument()
  })

  it('renderiza o indicador com texto de reconexão quando pending', () => {
    render(<ControlTopbar {...baseProps} mode="offline" syncStatus="pending" />)
    expect(screen.getByText('Salvo neste navegador · sincroniza ao reconectar')).toBeInTheDocument()
  })
})
