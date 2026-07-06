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
import { sendKeepaliveSessionPatch } from './keepalive-flush'
import { countAnsweredTiles } from '../domain/board.utils'
import { compareEventLogs } from '../domain/session'
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
   * Decide o que fazer entre o estado local e o da nuvem.
   *
   * Quando local e nuvem são a MESMA partida e ambos têm eventLog, a decisão
   * usa a relação de prefixo dos logs (revisão monotônica): quem contém o log
   * do outro está à frente; histórias divergentes viram 'conflict'. Sem log
   * dos dois lados, cai na heurística T7 (last-write-wins + guarda de
   * progresso por nº de cartas respondidas).
   *
   * - 'use-cloud'  + cloudSession : a nuvem deve vencer.
   * - 'keep-local'                : o local deve vencer.
   * - 'conflict'   + cloudSession : AMBÍGUO — o chamador deve perguntar ao usuário.
   * - 'none'                      : sem Supabase, sem auth, ou sem registro na nuvem.
   *
   * Nunca modifica o armazenamento local — quem chama decide.
   */
  reconcile(
    localUpdatedAtIso: string | null,
    localSession?: TriviaSession,
  ): Promise<{
    action: 'use-cloud' | 'keep-local' | 'none' | 'conflict'
    cloudSession?: TriviaSession
    cloudUpdatedAt?: string
  }>

  /**
   * Returns true when there is a snapshot that has not yet been successfully
   * persisted to the cloud (either not attempted yet, or last attempt failed).
   */
  hasPendingSync(): boolean

  /** ISO do último flush bem-sucedido nesta instância; null antes do primeiro. */
  getLastSyncedAt(): string | null

  /**
   * Returns the current observable sync status.
   * - 'idle'    : no push has been attempted yet
   * - 'syncing' : changes queued (debounce window) or a flush is in progress
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

  /** Horário (ISO) do último flush bem-sucedido; null antes do primeiro. */
  private _lastSyncedAt: string | null = null

  /** Registered status listeners. */
  private _listeners: Set<SyncStatusListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this._handleOnline = this._handleOnline.bind(this)
      this._handleVisibilityChange = this._handleVisibilityChange.bind(this)
      this._handleBeforeUnload = this._handleBeforeUnload.bind(this)
      this._handlePageHide = this._handlePageHide.bind(this)

      window.addEventListener('online', this._handleOnline)
      window.addEventListener('visibilitychange', this._handleVisibilityChange)
      window.addEventListener('beforeunload', this._handleBeforeUnload)
      // pagehide é mais confiável que beforeunload (Safari/mobile e bfcache).
      window.addEventListener('pagehide', this._handlePageHide)
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  pushSnapshot(session: TriviaSession, opts?: { title?: string }): void {
    // Coalesce: keep only the latest snapshot.
    const title = opts?.title ?? session.title ?? 'Sessão online'
    this.pending = { session, title, dirty: this.pending?.dirty ?? false }

    // Honestidade do indicador: há mudança enfileirada e ainda não enviada,
    // então o status NÃO pode continuar 'synced' durante a janela de debounce
    // ("Salvo na sua conta" com dado só na memória seria mentira).
    this._setStatus('syncing')

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
    localSession?: TriviaSession,
  ): Promise<{
    action: 'use-cloud' | 'keep-local' | 'none' | 'conflict'
    cloudSession?: TriviaSession
    cloudUpdatedAt?: string
  }> {
    const cloud = await this.pullActiveSnapshot()

    if (!cloud) return { action: 'none' }

    const cloudTs = new Date(cloud.updatedAt).getTime()
    const localTs = localUpdatedAtIso ? new Date(localUpdatedAtIso).getTime() : null

    // Sem jogo local → adota a nuvem.
    if (localTs === null) {
      return { action: 'use-cloud', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
    }

    const cloudIsNewer = cloudTs > localTs

    // Mesma partida com eventLog nos dois lados → decisão pela revisão
    // monotônica (relação de prefixo dos logs), imune a relógio e a jogadas
    // diferentes com a mesma contagem.
    const localLog = localSession?.eventLog
    const cloudLog = cloud.session.eventLog
    if (localSession && localSession.id === cloud.session.id && localLog && cloudLog) {
      const relation = compareEventLogs(localLog, cloudLog)
      if (relation === 'diverged') {
        return { action: 'conflict', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
      }
      if (relation === 'first-ahead') {
        return { action: 'keep-local' }
      }
      if (relation === 'second-ahead') {
        return { action: 'use-cloud', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
      }
      // 'equal': mesmo progresso de jogo — timestamps decidem a versão com as
      // edições cosméticas mais recentes (título, times etc.).
      if (cloudIsNewer) {
        return { action: 'use-cloud', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
      }
      return { action: 'keep-local' }
    }

    // Fallback (T7): sem log comparável — heurística de timestamp + progresso.
    const cloudProgress = countAnsweredTiles(cloud.session.board ?? [])
    const localProgress = countAnsweredTiles(localSession?.board ?? [])

    // Conflito: a versão MAIS NOVA tem MENOS progresso que a mais antiga —
    // ambíguo (ex.: jogou mais neste aparelho mas a nuvem foi tocada depois).
    // Melhor perguntar do que arriscar perder jogadas em qualquer direção.
    const conflict =
      (cloudIsNewer && localProgress > cloudProgress) ||
      (!cloudIsNewer && cloudProgress > localProgress)

    if (conflict) {
      return { action: 'conflict', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
    }

    if (cloudIsNewer) {
      return { action: 'use-cloud', cloudSession: cloud.session, cloudUpdatedAt: cloud.updatedAt }
    }

    return { action: 'keep-local' }
  }

  hasPendingSync(): boolean {
    return this.pending !== null
  }

  getLastSyncedAt(): string | null {
    return this._lastSyncedAt
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
      window.removeEventListener('pagehide', this._handlePageHide)
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
      this._lastSyncedAt = new Date().toISOString()
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
   * Caminho de saída da página: dispara o PATCH keepalive (sobrevive ao
   * unload) e, em paralelo, o flush assíncrono normal — se a página continuar
   * viva (beforeunload cancelado, aba apenas oculta), ele confirma o envio e
   * limpa o pendente. O keepalive não limpa `pending` porque não há como
   * confirmar sucesso.
   */
  private _emergencyFlush(): void {
    if (this.pending) {
      sendKeepaliveSessionPatch({
        title: this.pending.title,
        mode: 'cloud',
        session: this.pending.session,
      })
    }
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
