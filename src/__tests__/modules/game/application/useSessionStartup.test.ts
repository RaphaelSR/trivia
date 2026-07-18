jest.mock('@/modules/game/infrastructure/cloud-session-catalog.service', () => ({
  listMyCloudSessions: jest.fn(),
}))

import { act, renderHook, waitFor } from '@testing-library/react'
import { useSessionStartup } from '@/modules/game/application/useSessionStartup'
import { listMyCloudSessions } from '@/modules/game/infrastructure/cloud-session-catalog.service'
import type { CloudSessionCatalogResult } from '@/modules/game/infrastructure/cloud-session-catalog.service'
import { createEmptySession } from '@/modules/trivia/utils/createEmptySession'
import type { SessionRecord } from '@/modules/game/infrastructure/session.repository'

const mockListCloud = listMyCloudSessions as jest.Mock

function record(id: string, name = id): SessionRecord {
  const session = createEmptySession({ title: name })
  session.id = id
  session.teams = [{ id: 'team-a', name: 'A', color: '#fff', order: 0, members: [], score: 0 }]
  return {
    metadata: {
      id,
      name,
      createdAt: '2026-07-17T10:00:00.000Z',
      lastModified: '2026-07-17T11:00:00.000Z',
      isActive: true,
      mode: 'offline',
      duration: 60,
      isSaved: true,
    },
    session,
  }
}

const emptyCloud: CloudSessionCatalogResult = { records: [], error: null }

describe('useSessionStartup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListCloud.mockResolvedValue(emptyCloud)
  })

  it('pede decisão ao visitante quando existe partida local ativa', async () => {
    const local = record('local-1')
    const { result } = renderHook(() => useSessionStartup({
      gameMode: 'offline',
      userId: null,
      authLoading: false,
      storageReady: true,
      currentSession: local,
      sessionHistory: [local.metadata],
      loadSession: () => local.session,
    }))

    await waitFor(() => expect(result.current.status).toBe('decision'))
    expect(result.current.activeDevice?.record.session.id).toBe('local-1')
    expect(mockListCloud).not.toHaveBeenCalled()
  })

  it('segue direto quando não existe sessão local nem remota', async () => {
    const { result } = renderHook(() => useSessionStartup({
      gameMode: 'offline',
      userId: 'user-1',
      authLoading: false,
      storageReady: true,
      currentSession: null,
      sessionHistory: [],
      loadSession: () => null,
    }))

    await waitFor(() => expect(result.current.status).toBe('resolved'))
    expect(mockListCloud).toHaveBeenCalledTimes(1)
  })

  it('mantém partidas local e nuvem separadas para escolha explícita', async () => {
    const local = record('local-1')
    const cloud = record('cloud-1')
    mockListCloud.mockResolvedValue({
      records: [{
        rowId: 'row-cloud',
        status: 'active',
        title: cloud.session.title,
        mode: 'cloud',
        createdAt: cloud.metadata.createdAt,
        updatedAt: cloud.metadata.lastModified,
        session: cloud.session,
      }],
      error: null,
    })

    const { result } = renderHook(() => useSessionStartup({
      gameMode: 'offline',
      userId: 'user-1',
      authLoading: false,
      storageReady: true,
      currentSession: local,
      sessionHistory: [local.metadata],
      loadSession: () => local.session,
    }))

    await waitFor(() => expect(result.current.status).toBe('decision'))
    expect(result.current.candidates.map((item) => item.record.session.id)).toEqual(['local-1', 'cloud-1'])
    expect(result.current.activeCloud?.record.session.id).toBe('cloud-1')
  })

  it('não libera sincronização silenciosa quando a consulta à nuvem falha', async () => {
    mockListCloud.mockResolvedValue({ records: [], error: 'unavailable' })
    const { result } = renderHook(() => useSessionStartup({
      gameMode: 'offline',
      userId: 'user-1',
      authLoading: false,
      storageReady: true,
      currentSession: null,
      sessionHistory: [],
      loadSession: () => null,
    }))

    await waitFor(() => expect(result.current.status).toBe('decision'))
    expect(result.current.cloudUnavailable).toBe(true)
    expect(result.current.cloudSyncReady).toBe(false)
  })

  it('mantém a decisão resolvida mesmo quando a sessão ativa muda para a nova', async () => {
    const local = record('local-1')
    const fresh = record('fresh-2')
    const { result, rerender } = renderHook(
      ({ current }) => useSessionStartup({
        gameMode: 'offline',
        userId: null,
        authLoading: false,
        storageReady: true,
        currentSession: current,
        sessionHistory: [local.metadata],
        loadSession: (id) => id === 'local-1' ? local.session : null,
      }),
      { initialProps: { current: local } },
    )

    await waitFor(() => expect(result.current.status).toBe('decision'))
    act(() => result.current.resolve())
    rerender({ current: fresh })
    expect(result.current.status).toBe('resolved')
  })

  it('fecha o gate de sync imediatamente no primeiro render após o login', async () => {
    const local = record('local-1')
    let resolveCloud: ((result: CloudSessionCatalogResult) => void) | undefined
    mockListCloud.mockImplementation(() => new Promise<CloudSessionCatalogResult>((resolve) => {
      resolveCloud = resolve
    }))

    const { result, rerender } = renderHook(
      ({ userId }) => useSessionStartup({
        gameMode: 'offline',
        userId,
        authLoading: false,
        storageReady: true,
        currentSession: local,
        sessionHistory: [local.metadata],
        loadSession: () => local.session,
      }),
      { initialProps: { userId: null as string | null } },
    )

    await waitFor(() => expect(result.current.status).toBe('decision'))
    act(() => result.current.resolve())
    expect(result.current.status).toBe('resolved')

    rerender({ userId: 'user-1' })

    // Nenhum effect assíncrono precisa terminar para o push já estar vedado.
    expect(result.current.status).toBe('checking')

    await act(async () => {
      resolveCloud?.(emptyCloud)
    })
    await waitFor(() => expect(result.current.status).toBe('decision'))
    expect(result.current.cloudSyncReady).toBe(true)
  })
})
