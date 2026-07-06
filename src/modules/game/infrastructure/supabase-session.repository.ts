/**
 * SupabaseSessionRepository
 *
 * Implements SessionRepository with a write-through cache strategy:
 * - All synchronous interface methods delegate immediately to OnlineCacheSessionRepository.
 * - After each local write, schedules a debounced (~2.5s trailing) cloud flush so that
 *   a burst of N saves collapses to a single UPSERT (coalescing).
 * - flushNow() forces an immediate flush; called on visibilitychange=hidden and beforeunload.
 * - Network failures are retried on the next flush or on the browser 'online' event;
 *   console.warn is used at most once per failure; nothing is ever thrown to callers.
 * - hydrateFromCloud() is an EXTRA method (outside the SessionRepository interface) that
 *   pulls the active cloud session and writes it to the local cache if it is newer.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import type { GameMode } from '../../../shared/types/game'
import type { TriviaSession } from '../../trivia/types'
import { sendKeepaliveSessionPatch } from './keepalive-flush'
import { OnlineCacheSessionRepository } from './online-cache-session.repository'
import type { SessionHistoryMetadata, SessionRecord, SessionRepository } from './session.repository'

interface CloudRecord {
  user_id: string
  status: 'active' | 'archived'
  title: string
  mode: string
  session: TriviaSession
  updated_at?: string
}

export class SupabaseSessionRepository implements SessionRepository {
  private readonly cache = new OnlineCacheSessionRepository()

  /** The latest snapshot waiting to be flushed; null = nothing pending. */
  private pendingSnapshot: CloudRecord | null = null

  /** Timer handle for the debounced flush. */
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  private static readonly DEBOUNCE_MS = 2500

  constructor() {
    if (typeof window !== 'undefined') {
      this._handleVisibilityChange = this._handleVisibilityChange.bind(this)
      this._handleBeforeUnload = this._handleBeforeUnload.bind(this)
      this._handlePageHide = this._handlePageHide.bind(this)
      this._handleOnline = this._handleOnline.bind(this)

      window.addEventListener('visibilitychange', this._handleVisibilityChange)
      window.addEventListener('beforeunload', this._handleBeforeUnload)
      // pagehide é mais confiável que beforeunload (Safari/mobile e bfcache).
      window.addEventListener('pagehide', this._handlePageHide)
      window.addEventListener('online', this._handleOnline)
    }
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this._handleVisibilityChange)
      window.removeEventListener('beforeunload', this._handleBeforeUnload)
      window.removeEventListener('pagehide', this._handlePageHide)
      window.removeEventListener('online', this._handleOnline)
    }
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  // ── SessionRepository interface ───────────────────────────────────────────

  loadActiveSession(): SessionRecord | null {
    return this.cache.loadActiveSession()
  }

  loadSessionHistory(): SessionHistoryMetadata[] {
    return this.cache.loadSessionHistory()
  }

  saveSession(
    session: TriviaSession,
    mode: GameMode,
    sessionName?: string,
    current?: SessionRecord | null,
  ): SessionRecord | null {
    const record = this.cache.saveSession(session, mode, sessionName, current)
    if (record) {
      this._scheduleCloudFlush(record)
    }
    return record
  }

  loadSession(sessionId: string): TriviaSession | null {
    return this.cache.loadSession(sessionId)
  }

  deleteSession(sessionId: string): void {
    this.cache.deleteSession(sessionId)
    // Fire-and-forget: archive in the cloud
    void this._archiveInCloud()
  }

  clearActiveSession(): void {
    this.cache.clearActiveSession()
    // Fire-and-forget: archive in the cloud
    void this._archiveInCloud()
  }

  saveCompleteSession(sessionData: SessionRecord): boolean {
    const ok = this.cache.saveCompleteSession(sessionData)
    if (ok) {
      this._scheduleCloudFlush(sessionData)
    }
    return ok
  }

  getBackendLabel(): string {
    return 'supabase'
  }

  // ── Extra method (outside interface) ─────────────────────────────────────

  /**
   * Fetches the user's active cloud session.
   * If the cloud record is newer than the local cache (or the cache is empty),
   * writes it to the local cache and returns the record.
   * Returns null if the cache is already up-to-date or if unavailable.
   */
  async hydrateFromCloud(): Promise<SessionRecord | null> {
    if (!this._isReadyForCloud()) return null

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

    const cloudRecord = data as {
      id: string
      user_id: string
      status: string
      title: string
      mode: string
      session: TriviaSession
      created_at: string
      updated_at: string
    }

    const localActive = this.cache.loadActiveSession()
    const localModified = localActive?.metadata.lastModified

    const cloudUpdatedAt = cloudRecord.updated_at
    const cloudIsNewer =
      !localModified || new Date(cloudUpdatedAt) > new Date(localModified)

    if (!cloudIsNewer) return null

    // Build a SessionRecord from the cloud snapshot
    const sessionRecord: SessionRecord = {
      metadata: {
        id: cloudRecord.session.id || cloudRecord.id,
        name: cloudRecord.title,
        createdAt: cloudRecord.created_at,
        lastModified: cloudRecord.updated_at,
        isActive: true,
        mode: cloudRecord.mode as GameMode,
        duration: 0,
        isSaved: true,
      },
      session: cloudRecord.session,
    }

    this.cache.saveCompleteSession(sessionRecord)
    return sessionRecord
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _isReadyForCloud(): boolean {
    return isSupabaseConfigured()
  }

  private _scheduleCloudFlush(record: SessionRecord): void {
    // Coalesce: always keep the latest snapshot only
    this.pendingSnapshot = {
      user_id: '', // resolved during flush from auth session
      status: 'active',
      title: record.metadata.name,
      mode: record.metadata.mode,
      session: record.session,
    }

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this._doFlush()
    }, SupabaseSessionRepository.DEBOUNCE_MS)
  }

  /** Forces an immediate flush, bypassing the debounce. */
  async flushNow(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    await this._doFlush()
  }

  private async _doFlush(): Promise<void> {
    if (!this.pendingSnapshot) return
    if (!this._isReadyForCloud()) return

    const client = getSupabaseClient()!
    const {
      data: { session: authSession },
    } = await client.auth.getSession()

    if (!authSession?.user) return

    const snapshot = this.pendingSnapshot
    snapshot.user_id = authSession.user.id

    try {
      // update-then-insert strategy (avoids ON CONFLICT with partial index)
      const { data: updated, error: updateError } = await client
        .from('online_sessions')
        .update({
          title: snapshot.title,
          mode: snapshot.mode,
          session: snapshot.session,
        })
        .eq('user_id', snapshot.user_id)
        .eq('status', 'active')
        .select('id')

      if (updateError) throw updateError

      if (!updated || updated.length === 0) {
        // No active row yet — insert
        const { error: insertError } = await client.from('online_sessions').insert({
          user_id: snapshot.user_id,
          status: 'active',
          title: snapshot.title,
          mode: snapshot.mode,
          session: snapshot.session,
        })
        if (insertError) throw insertError
      }

      // Flush succeeded — clear the pending snapshot (only if it hasn't been
      // replaced by a newer save that came in while we were awaiting)
      if (this.pendingSnapshot === snapshot) {
        this.pendingSnapshot = null
      }
    } catch (err) {
      console.warn('[SupabaseSessionRepository] Cloud flush failed; will retry:', err)
      // pendingSnapshot is preserved so the next flush or 'online' event retries it
    }
  }

  private async _archiveInCloud(): Promise<void> {
    if (!this._isReadyForCloud()) return

    const client = getSupabaseClient()!
    const {
      data: { session: authSession },
    } = await client.auth.getSession()

    if (!authSession?.user) return

    try {
      await client
        .from('online_sessions')
        .update({ status: 'archived' })
        .eq('user_id', authSession.user.id)
        .eq('status', 'active')
    } catch (err) {
      console.warn('[SupabaseSessionRepository] Cloud archive failed:', err)
    }
  }

  // ── Window event handlers ─────────────────────────────────────────────────

  private _handleVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this._emergencyFlush()
    }
  }

  private _handleBeforeUnload(): void {
    this._emergencyFlush()
  }

  private _handlePageHide(): void {
    this._emergencyFlush()
  }

  /**
   * Caminho de saída da página: PATCH keepalive (sobrevive ao unload) +
   * flush assíncrono normal para o caso de a página continuar viva.
   */
  private _emergencyFlush(): void {
    if (this.pendingSnapshot) {
      sendKeepaliveSessionPatch({
        title: this.pendingSnapshot.title,
        mode: this.pendingSnapshot.mode,
        session: this.pendingSnapshot.session,
      })
    }
    void this.flushNow()
  }

  private _handleOnline(): void {
    if (this.pendingSnapshot) {
      void this._doFlush()
    }
  }
}
