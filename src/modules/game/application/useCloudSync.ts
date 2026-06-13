/**
 * useCloudSync
 *
 * Orchestrates background cloud backup for a local-first TriviaSession.
 *
 * Design principles:
 * - PUSH: when `enabled` is true and `session` changes, calls pushSnapshot()
 *   on the CloudSessionSync service (already debounced at 2.5 s).
 *   Sessions without teams are NOT pushed (nothing meaningful to persist yet).
 * - PULL/RECONCILE: once per activation (when `enabled` becomes true), calls
 *   reconcile() with the local session's lastModified timestamp.
 *   - 'use-cloud' → calls onRestore(cloudSession) so the parent can apply it.
 *   - 'keep-local' → pushes the local state to cloud + flushNow() to align.
 *   - 'none'       → no cloud record; does nothing.
 * - Resilience is entirely handled by CloudSessionSync; this hook only
 *   orchestrates the calls and never throws.
 * - Cleans up (dispose) on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createCloudSessionSync } from '../infrastructure/cloud-session-sync'
import type { TriviaSession } from '../../trivia/types'

/**
 * UI-facing sync status, derived from the service's internal SyncStatus.
 * - 'local-only' : cloud sync is disabled (not logged in / Supabase unconfigured)
 * - 'syncing'    : a flush is in progress
 * - 'synced'     : last flush succeeded, nothing pending
 * - 'pending'    : flush failed or auth missing; data is saved locally pending retry
 */
export type CloudSyncStatus = 'local-only' | 'syncing' | 'synced' | 'pending'

export interface UseCloudSyncOptions {
  /** Session to back up. */
  session: TriviaSession
  /**
   * Whether cloud sync is active. Caller is responsible for the decision:
   *   enabled = Boolean(user) && isSupabaseConfigured()
   */
  enabled: boolean
  /** Human-readable title stored in the cloud row (e.g. session.title). */
  title: string
  /**
   * Called when reconcile returns 'use-cloud'.  The caller must apply the
   * cloud session to local state AND persist it locally so a reload survives.
   */
  onRestore: (cloudSession: TriviaSession) => void
  /**
   * ISO-8601 timestamp of the local session's last modification.
   * Comes from SessionRecord.metadata.lastModified of the loaded active session.
   * Pass null when there is no local session saved yet.
   */
  localUpdatedAtIso: string | null
}

export function useCloudSync({
  session,
  enabled,
  title,
  onRestore,
  localUpdatedAtIso,
}: UseCloudSyncOptions): { status: CloudSyncStatus; forceSync: () => void } {
  // Stable instance for the lifetime of the component
  const syncRef = useRef(createCloudSessionSync())

  // Observable sync status for UI
  const [status, setStatus] = useState<CloudSyncStatus>('local-only')

  // Track whether we've already run the initial reconcile for the current
  // enabled=true activation, to avoid re-running on every re-render.
  const reconciledRef = useRef(false)

  // Whether the immediate initial flush already happened for the current
  // activation. Reset when enabled goes false so a re-login flushes again.
  const initialFlushDoneRef = useRef(false)

  // Stable ref to onRestore so the effect doesn't re-run when the callback identity changes
  const onRestoreRef = useRef(onRestore)
  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  // Latest session+title+enabled ref — updated every render (sync-with-render
  // pattern) so that forceSync always reads current values with zero deps.
  const latestRef = useRef({ session, title, enabled })
  latestRef.current = { session, title, enabled }

  // forceSync: manual escape-hatch — pushes the latest snapshot immediately.
  // Stable via useCallback([]) — latestRef and syncRef are stable refs.
  const forceSync = useCallback(() => {
    const { enabled: latestEnabled, session: latestSession, title: latestTitle } = latestRef.current
    if (!latestEnabled) return
    syncRef.current.pushSnapshot(latestSession, { title: latestTitle })
    void syncRef.current.flushNow()
  }, [])

  // Dispose on unmount
  useEffect(() => {
    const sync = syncRef.current
    return () => {
      sync.dispose()
    }
  }, [])

  // Reset per-activation flags when enabled toggles off (logout / unconfigured)
  useEffect(() => {
    if (!enabled) {
      reconciledRef.current = false
      initialFlushDoneRef.current = false
    }
  }, [enabled])

  // PULL/RECONCILE: run once per activation
  useEffect(() => {
    if (!enabled) return
    if (reconciledRef.current) return

    reconciledRef.current = true

    const sync = syncRef.current

    void (async () => {
      try {
        const result = await sync.reconcile(localUpdatedAtIso)

        if (result.action === 'use-cloud' && result.cloudSession) {
          onRestoreRef.current(result.cloudSession)
        } else if (result.action === 'keep-local') {
          // Local is fresher — push it up to align the cloud copy
          sync.pushSnapshot(session, { title })
          await sync.flushNow()
        }
        // 'none' → sem registro na nuvem; o push effect abaixo cuida do upload
        // inicial (com flush imediato) quando há times.
      } catch {
        // Never propagate; CloudSessionSync already handles errors internally
      }
    })()
    // Intentionally exhaustive: we want this to run exactly once when enabled
    // transitions to true. localUpdatedAtIso is captured at activation time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // PUSH: whenever session changes while enabled (and the session has teams)
  useEffect(() => {
    if (!enabled) return
    if (session.teams.length === 0) return

    syncRef.current.pushSnapshot(session, { title })

    // Upload inicial IMEDIATO: no primeiro push de uma ativação (login com uma
    // sessão já montada), faz flushNow em vez de esperar o debounce de 2.5s —
    // assim não fica preso em "Salvo neste navegador" se a sessão não mudar
    // mais, nem é starvado por mudanças frequentes. enabled é checado de forma
    // síncrona aqui, então não há corrida com logout (diferente do reconcile async).
    if (!initialFlushDoneRef.current) {
      initialFlushDoneRef.current = true
      void syncRef.current.flushNow()
    }
    // title changes are intentionally NOT a dep here — we want to push on session
    // content changes only; the title is just metadata captured at push time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session])

  // Subscribe to service status and map to UI status
  useEffect(() => {
    if (!enabled) {
      setStatus('local-only')
      return
    }

    const unsubscribe = syncRef.current.subscribe((serviceStatus) => {
      // Map service SyncStatus → CloudSyncStatus
      // 'idle' before first push = 'local-only' (nothing synced yet)
      if (serviceStatus === 'idle') {
        setStatus('local-only')
      } else if (serviceStatus === 'syncing') {
        setStatus('syncing')
      } else if (serviceStatus === 'synced') {
        setStatus('synced')
      } else {
        // 'pending'
        setStatus('pending')
      }
    })

    return unsubscribe
  }, [enabled])

  return { status, forceSync }
}
