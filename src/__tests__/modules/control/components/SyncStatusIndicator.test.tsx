/**
 * Testes para SyncStatusIndicator
 *
 * Garante que cada status de UI exibe o texto pt-BR correto e que
 * o componente possui aria-live para acessibilidade.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('SyncStatusIndicator — forceSync', () => {
  it('com onForceSync e status !== syncing: renderiza como button com aria-label "Sincronizar agora"', () => {
    render(<SyncStatusIndicator status="synced" onForceSync={jest.fn()} />)
    const btn = screen.getByRole('button', { name: 'Sincronizar agora' })
    expect(btn).toBeInTheDocument()
  })

  it('clicar no button dispara onForceSync', async () => {
    const onForceSync = jest.fn()
    render(<SyncStatusIndicator status="synced" onForceSync={onForceSync} />)
    const btn = screen.getByRole('button', { name: 'Sincronizar agora' })
    await userEvent.click(btn)
    expect(onForceSync).toHaveBeenCalledTimes(1)
  })

  it('com onForceSync e status pending: renderiza como button clicável', () => {
    render(<SyncStatusIndicator status="pending" onForceSync={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeInTheDocument()
  })

  it('com onForceSync e status local-only: renderiza como button clicável', () => {
    render(<SyncStatusIndicator status="local-only" onForceSync={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Sincronizar agora' })).toBeInTheDocument()
  })

  it('com onForceSync e status syncing: NÃO renderiza como button (syncing em progresso)', () => {
    render(<SyncStatusIndicator status="syncing" onForceSync={jest.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sem onForceSync: NÃO renderiza como button (qualquer status)', () => {
    render(<SyncStatusIndicator status="synced" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mantém aria-live="polite" quando renderiza como button', () => {
    render(<SyncStatusIndicator status="synced" onForceSync={jest.fn()} />)
    const btn = screen.getByRole('button', { name: 'Sincronizar agora' })
    expect(btn).toHaveAttribute('aria-live', 'polite')
  })
})
