/**
 * Testes para SyncStatusIndicator
 *
 * Garante que cada status de UI exibe o texto pt-BR correto e que
 * o componente possui aria-live para acessibilidade.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SyncStatusIndicator } from '@/modules/control/ui/SyncStatusIndicator'
import type { CloudSyncStatus } from '@/modules/game/application/useCloudSync'

describe('SyncStatusIndicator', () => {
  it('exibe "Salvo neste navegador" para status local-only', () => {
    render(<SyncStatusIndicator status="local-only" />)
    expect(screen.getByText('Salvo neste navegador')).toBeInTheDocument()
  })

  it('exibe "Salvando…" para status syncing', () => {
    render(<SyncStatusIndicator status="syncing" />)
    expect(screen.getByText('Salvando…')).toBeInTheDocument()
  })

  it('exibe "Salvo na sua conta" para status synced', () => {
    render(<SyncStatusIndicator status="synced" />)
    expect(screen.getByText('Salvo na sua conta')).toBeInTheDocument()
  })

  it('exibe texto de reconexão para status pending', () => {
    render(<SyncStatusIndicator status="pending" />)
    expect(screen.getByText('Salvo neste navegador · sincroniza ao reconectar')).toBeInTheDocument()
  })

  it('possui aria-live="polite" para anunciar mudanças a leitores de tela', () => {
    const { container } = render(<SyncStatusIndicator status="local-only" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveAttribute('aria-live', 'polite')
  })

  it('renderiza corretamente para todos os status conhecidos', () => {
    const statuses: CloudSyncStatus[] = ['local-only', 'syncing', 'synced', 'pending']
    for (const status of statuses) {
      const { unmount } = render(<SyncStatusIndicator status={status} />)
      unmount()
    }
  })
})
