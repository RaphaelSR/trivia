import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameMode } from '../../../shared/types/game'
import type { SessionHistoryMetadata, SessionRecord } from '../infrastructure/session.repository'
import {
  listMyCloudSessions,
  type CloudSessionCatalogResult,
} from '../infrastructure/cloud-session-catalog.service'
import { hasMeaningfulSessionData } from '../domain/session-start'

export type SessionStartCandidate = {
  key: string
  source: 'device' | 'cloud'
  active: boolean
  record: SessionRecord
  cloudRowId?: string
}

export type SessionStartupStatus = 'checking' | 'decision' | 'resolved'

type UseSessionStartupOptions = {
  gameMode: GameMode
  userId: string | null
  authLoading: boolean
  storageReady: boolean
  currentSession: SessionRecord | null
  sessionHistory: SessionHistoryMetadata[]
  loadSession: (sessionId: string) => SessionRecord['session'] | null
}

function localCandidates(
  currentSession: SessionRecord | null,
  history: SessionHistoryMetadata[],
  loadSession: (sessionId: string) => SessionRecord['session'] | null,
): SessionStartCandidate[] {
  const seen = new Set<string>()
  const candidates: SessionStartCandidate[] = []

  const append = (record: SessionRecord, active: boolean) => {
    if (seen.has(record.session.id) || (!active && !hasMeaningfulSessionData(record.session))) return
    seen.add(record.session.id)
    candidates.push({
      key: `device:${record.session.id}`,
      source: 'device',
      active,
      record,
    })
  }

  if (currentSession) append(currentSession, true)
  for (const metadata of history) {
    const session = loadSession(metadata.id)
    if (!session) continue
    append({ metadata, session }, currentSession?.session.id === session.id)
  }

  return candidates
}

export function useSessionStartup({
  gameMode,
  userId,
  authLoading,
  storageReady,
  currentSession,
  sessionHistory,
  loadSession,
}: UseSessionStartupOptions) {
  const [status, setStatus] = useState<SessionStartupStatus>(gameMode === 'demo' ? 'resolved' : 'checking')
  const [candidates, setCandidates] = useState<SessionStartCandidate[]>([])
  const [cloudUnavailable, setCloudUnavailable] = useState(false)
  const [cloudSyncReady, setCloudSyncReady] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const evaluatedKeyRef = useRef<string | null>(null)
  const requestRef = useRef(0)
  const previousUserRef = useRef<string | null | undefined>(undefined)
  const evaluationKey = `${gameMode}:${userId ?? 'guest'}:${retryNonce}`

  useEffect(() => {
    if (gameMode === 'demo') {
      setStatus('resolved')
      return
    }
    if (authLoading || !storageReady) {
      setStatus('checking')
      return
    }
    if (evaluatedKeyRef.current === evaluationKey) return

    // Sair da conta nao deve interromper uma partida que ja estava aberta.
    // A entrada inicial como visitante continua passando pela escolha local.
    if (previousUserRef.current && !userId) {
      previousUserRef.current = null
      evaluatedKeyRef.current = evaluationKey
      setCandidates([])
      setCloudUnavailable(false)
      setCloudSyncReady(false)
      setStatus('resolved')
      return
    }

    previousUserRef.current = userId
    evaluatedKeyRef.current = evaluationKey
    const requestId = ++requestRef.current
    if (userId) setCloudSyncReady(false)
    setStatus('checking')

    void (async () => {
      const device = localCandidates(currentSession, sessionHistory, loadSession)
      const cloudResult: CloudSessionCatalogResult = userId
        ? await listMyCloudSessions()
        : { records: [], error: null }
      if (requestRef.current !== requestId) return

      const cloud: SessionStartCandidate[] = []
      const seenCloudSessionIds = new Set<string>()
      const orderedCloud = [...cloudResult.records].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1
        return b.updatedAt.localeCompare(a.updatedAt)
      })
      for (const entry of orderedCloud) {
        if (seenCloudSessionIds.has(entry.session.id) || (entry.status !== 'active' && !hasMeaningfulSessionData(entry.session))) continue
        seenCloudSessionIds.add(entry.session.id)
        cloud.push({
          key: `cloud:${entry.rowId}`,
          source: 'cloud',
          active: entry.status === 'active',
          cloudRowId: entry.rowId,
          record: {
            metadata: {
              id: entry.session.id,
              name: entry.title || entry.session.title,
              createdAt: entry.createdAt,
              lastModified: entry.updatedAt,
              isActive: entry.status === 'active',
              mode: gameMode,
              duration: 0,
              isSaved: true,
            },
            session: entry.session,
          },
        })
      }

      const nextCandidates = [...device, ...cloud]
      setCandidates(nextCandidates)
      setCloudUnavailable(cloudResult.error === 'unavailable')
      setCloudSyncReady(Boolean(userId) && cloudResult.error === null)
      setStatus(nextCandidates.length > 0 || cloudResult.error === 'unavailable' ? 'decision' : 'resolved')
    })()
  }, [authLoading, currentSession, evaluationKey, gameMode, loadSession, sessionHistory, storageReady, userId])

  const resolve = useCallback(() => {
    requestRef.current += 1
    setStatus('resolved')
  }, [])

  const retry = useCallback(() => {
    evaluatedKeyRef.current = null
    setCloudSyncReady(false)
    setRetryNonce((value) => value + 1)
  }, [])

  const activeDevice = useMemo(
    () => candidates.find((candidate) => candidate.source === 'device' && candidate.active) ?? null,
    [candidates],
  )
  const activeCloud = useMemo(
    () => candidates.find((candidate) => candidate.source === 'cloud' && candidate.active) ?? null,
    [candidates],
  )

  // Effects rodam depois do commit. Sem este gate derivado, o primeiro render
  // logo após um login ainda exporia `resolved` da fase visitante e poderia
  // habilitar o push da sessão local antes de o catálogo da conta ser lido.
  // O logout é a exceção segura: sem usuário não há sync a bloquear e não
  // interrompemos a partida com um flash do modal.
  const isLogoutTransition = Boolean(previousUserRef.current) && !userId
  const effectiveStatus: SessionStartupStatus = gameMode === 'demo'
    ? 'resolved'
    : authLoading || !storageReady || (evaluatedKeyRef.current !== evaluationKey && !isLogoutTransition)
      ? 'checking'
      : status

  return {
    status: effectiveStatus,
    candidates,
    activeDevice,
    activeCloud,
    cloudUnavailable,
    cloudSyncReady,
    resolve,
    retry,
  }
}
