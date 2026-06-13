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

import { useEffect, useRef } from 'react'
import { createCloudSessionSync } from '../infrastructure/cloud-session-sync'
import type { TriviaSession } from '../../trivia/types'

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
}: UseCloudSyncOptions): void {
  // Stable instance for the lifetime of the component
  const syncRef = useRef(createCloudSessionSync())

  // Track whether we've already run the initial reconcile for the current
  // enabled=true activation, to avoid re-running on every re-render.
  const reconciledRef = useRef(false)

  // Stable ref to onRestore so the effect doesn't re-run when the callback identity changes
  const onRestoreRef = useRef(onRestore)
  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  // Dispose on unmount
  useEffect(() => {
    const sync = syncRef.current
    return () => {
      sync.dispose()
    }
  }, [])

  // Reset reconcile flag when enabled toggles off (logout / Supabase unconfigured)
  useEffect(() => {
    if (!enabled) {
      reconciledRef.current = false
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
        // 'none' → no cloud record; nothing to do
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
    // title changes are intentionally NOT a dep here — we want to push on session
    // content changes only; the title is just metadata captured at push time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session])
}
