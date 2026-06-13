/**
 * CloudSessionSync
 *
 * A standalone background-sync service that mirrors an arbitrary TriviaSession
 * to Supabase's online_sessions table.  It is NOT a SessionRepository — it
 * only knows about snapshots.
 *
 * Design principles:
 * - Local is always the source of truth; cloud is a replica.
 * - pushSnapshot() schedules a debounced (~2.5 s trailing) upsert so that a
 *   burst of N saves collapses to a single network round-trip (coalescing).
 * - flushNow() forces an immediate write (beforeunload / visibilitychange=hidden).
 * - pullActiveSnapshot() fetches the user's active cloud record for use during
 *   login / cross-device hydration.
 * - reconcile() performs last-write-wins comparison between local and cloud so
 *   callers can decide which copy to keep; this service never mutates local state.
 * - Resilience: any network or auth failure is caught, console.warn'd at most
 *   once, and the pending snapshot is PRESERVED so the next push, 'online'
 *   event, or flushNow() retries automatically.
 * - hasPendingSync() exposes the dirty flag for testing and UI indicators.
 * - All methods are no-ops when isSupabaseConfigured() === false.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import type { TriviaSession } from '../../trivia/types'

// ── Internal types ────────────────────────────────────────────────────────────

interface PendingRecord {
  session: TriviaSession
  title: string
  /** Set to true after at least one flush attempt failed. */
  dirty: boolean
}

/** Observable sync status for UI indicators. */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending'

export type SyncStatusListener = (status: SyncStatus) => void

// ── Public API ────────────────────────────────────────────────────────────────

export interface CloudSessionSync {
  /**
   * Schedules a debounced upsert of `session` to the cloud.  Coalescing: only
   * the latest snapshot in any burst window is flushed.  Never throws.
   */
  pushSnapshot(session: TriviaSession, opts?: { title?: string }): void

  /**
   * Cancels any pending debounce timer and immediately flushes the latest
   * snapshot to the cloud.  Returns a Promise that always resolves (never
   * rejects), suitable for beforeunload / visibilitychange handlers.
   */
  flushNow(): Promise<void>

  /**
   * Fetches the user's active cloud session record.
   * Returns null when Supabase is not configured, the user is not logged in,
   * or no active row exists for the user.
   */
  pullActiveSnapshot(): Promise<{ session: TriviaSession; updatedAt: string } | null>

  /**
   * Compares cloud updated_at against `localUpdatedAtIso` (last-write-wins).
   *
   * - 'use-cloud'  + cloudSession : cloud record is newer than local (or local is null).
   * - 'keep-local'                : local record is newer or equal.
   * - 'none'                      : no Supabase config, no auth, or no cloud record.
   *
   * This method NEVER modifies local storage — the caller decides what to do.
   */
  reconcile(
    localUpdatedAtIso: string | null,
  ): Promise<{ action: 'use-cloud' | 'keep-local' | 'none'; cloudSession?: TriviaSession }>

  /**
   * Returns true when there is a snapshot that has not yet been successfully
   * persisted to the cloud (either not attempted yet, or last attempt failed).
   */
  hasPendingSync(): boolean

  /**
   * Returns the current observable sync status.
   * - 'idle'    : no push has been attempted yet
   * - 'syncing' : a flush is in progress
   * - 'synced'  : last flush succeeded, nothing pending
   * - 'pending' : flush failed or auth missing; data preserved locally
   */
  getStatus(): SyncStatus

  /**
   * Subscribes to sync status changes.  Returns an unsubscribe function.
   * The listener is called immediately with the current status on subscription.
   */
  subscribe(listener: SyncStatusListener): () => void

  /**
   * Removes window event listeners, clears internal timers, and removes all
   * status listeners.  Call when the service instance is no longer needed.
   */
  dispose(): void
}

// ── Implementation ────────────────────────────────────────────────────────────

class CloudSessionSyncImpl implements CloudSessionSync {
  private static readonly DEBOUNCE_MS = 2500

  /** Latest snapshot waiting to be flushed; null = nothing pending. */
  private pending: PendingRecord | null = null

  /** Debounce timer handle. */
  private timer: ReturnType<typeof setTimeout> | null = null

  /** Observable sync status. */
  private _status: SyncStatus = 'idle'

  /** Registered status listeners. */
  private _listeners: Set<SyncStatusListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this._handleOnline = this._handleOnline.bind(this)
      this._handleVisibilityChange = this._handleVisibilityChange.bind(this)
      this._handleBeforeUnload = this._handleBeforeUnload.bind(this)

      window.addEventListener('online', this._handleOnline)
      window.addEventListener('visibilitychange', this._handleVisibilityChange)
      window.addEventListener('beforeunload', this._handleBeforeUnload)
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  pushSnapshot(session: TriviaSession, opts?: { title?: string }): void {
    // Coalesce: keep only the latest snapshot.
    const title = opts?.title ?? session.title ?? 'Sessao online'
    this.pending = { session, title, dirty: this.pending?.dirty ?? false }

    if (this.timer !== null) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = null
      void this._doFlush()
    }, CloudSessionSyncImpl.DEBOUNCE_MS)
  }

  async flushNow(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this._doFlush()
  }

  async pullActiveSnapshot(): Promise<{ session: TriviaSession; updatedAt: string } | null> {
    if (!isSupabaseConfigured()) return null

    const client = getSupabaseClient()!
    const {
      data: { session: authSession },
    } = await client.auth.getSession()

    if (!authSession?.user) return null

    const { data, error } = await client
      .from('online_sessions')
      .select('*')
      .eq('user_id', authSession.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    const row = data as { session: TriviaSession; updated_at: string }
    return { session: row.session, updatedAt: row.updated_at }
  }

  async reconcile(
    localUpdatedAtIso: string | null,
  ): Promise<{ action: 'use-cloud' | 'keep-local' | 'none'; cloudSession?: TriviaSession }> {
    const cloud = await this.pullActiveSnapshot()

    if (!cloud) return { action: 'none' }

    const cloudTs = new Date(cloud.updatedAt).getTime()
    const localTs = localUpdatedAtIso ? new Date(localUpdatedAtIso).getTime() : null

    if (localTs === null || cloudTs > localTs) {
      return { action: 'use-cloud', cloudSession: cloud.session }
    }

    return { action: 'keep-local' }
  }

  hasPendingSync(): boolean {
    return this.pending !== null
  }

  getStatus(): SyncStatus {
    return this._status
  }

  subscribe(listener: SyncStatusListener): () => void {
    this._listeners.add(listener)
    // Immediately notify with current status
    listener(this._status)
    return () => {
      this._listeners.delete(listener)
    }
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline)
      window.removeEventListener('visibilitychange', this._handleVisibilityChange)
      window.removeEventListener('beforeunload', this._handleBeforeUnload)
    }
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this._listeners.clear()
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _setStatus(status: SyncStatus): void {
    if (this._status === status) return
    this._status = status
    for (const listener of this._listeners) {
      listener(status)
    }
  }

  private async _doFlush(): Promise<void> {
    if (!this.pending) return
    if (!isSupabaseConfigured()) {
      // No config — if there's a pending snapshot, mark it as pending UI state
      if (this.pending) this._setStatus('pending')
      return
    }

    const client = getSupabaseClient()!
    const {
      data: { session: authSession },
    } = await client.auth.getSession()

    if (!authSession?.user) {
      // Not logged in — keep pending so we retry once the user signs in.
      if (this.pending) this._setStatus('pending')
      return
    }

    this._setStatus('syncing')

    const record = this.pending
    const userId = authSession.user.id

    try {
      // update-then-insert strategy: avoids conflicts with the partial unique
      // index (online_sessions_one_active_per_user_idx) that only covers
      // status='active' rows.
      const { data: updated, error: updateError } = await client
        .from('online_sessions')
        .update({
          title: record.title,
          mode: 'cloud',
          session: record.session,
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select('id')

      if (updateError) throw updateError

      if (!updated || updated.length === 0) {
        // No active row yet — insert one.
        const { error: insertError } = await client.from('online_sessions').insert({
          user_id: userId,
          status: 'active',
          title: record.title,
          mode: 'cloud',
          session: record.session,
        })
        if (insertError) throw insertError
      }

      // Success: clear pending only if a newer push hasn't replaced it.
      if (this.pending === record) {
        this.pending = null
      }
      this._setStatus('synced')
    } catch (err) {
      console.warn('[CloudSessionSync] Cloud flush failed; will retry on next push or online event:', err)
      // Mark dirty so hasPendingSync() stays true and callers can show
      // a "sync pending" indicator.  Do NOT clear this.pending.
      if (this.pending === record) {
        this.pending = { ...record, dirty: true }
      }
      this._setStatus('pending')
    }
  }

  // ── Window event handlers ───────────────────────────────────────────────────

  private _handleOnline(): void {
    if (this.pending) {
      void this._doFlush()
    }
  }

  private _handleVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      void this.flushNow()
    }
  }

  private _handleBeforeUnload(): void {
    void this.flushNow()
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates and returns a new CloudSessionSync instance.
 *
 * Each call returns a fresh instance with its own timer and event listeners.
 * Call dispose() when the instance is no longer needed.
 */
export function createCloudSessionSync(): CloudSessionSync {
  return new CloudSessionSyncImpl()
}
