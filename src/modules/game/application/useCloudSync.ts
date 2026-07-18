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
import { saveSessionSnapshot } from '../infrastructure/session-snapshot.service'
import { countAnsweredTiles } from '../domain/board.utils'
import type { TriviaSession } from '../../trivia/types'

/** Intervalo mínimo entre checkpoints de versão (T4) — evita 1 snapshot por flush. */
const SNAPSHOT_THROTTLE_MS = 3 * 60 * 1000

/** Falhas consecutivas de snapshot antes de avisar o usuário. */
const SNAPSHOT_FAILURE_ALERT_THRESHOLD = 2

/**
 * Conflito detectado no reconcile: local e nuvem divergem de forma ambígua
 * (a versão mais nova tem menos progresso). O caller mostra um modal e deixa
 * o usuário escolher qual versão manter.
 */
export interface CloudSyncConflict {
  localSession: TriviaSession
  cloudSession: TriviaSession
  localUpdatedAt: string | null
  cloudUpdatedAt: string | null
}

/**
 * UI-facing sync status, derived from the service's internal SyncStatus.
 * - 'local-only' : cloud sync is disabled (not logged in / Supabase unconfigured)
 * - 'syncing'    : changes queued (debounce window) or a flush is in progress
 * - 'synced'     : last flush succeeded, nothing pending
 * - 'pending'    : flush failed or auth missing; data is saved locally pending retry
 */
export type CloudSyncStatus = 'local-only' | 'review-needed' | 'syncing' | 'synced' | 'pending'

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
   * Chamado quando o reconcile detecta um CONFLITO ambíguo (local x nuvem).
   * Quando ausente, o hook cai no fallback seguro (mantém o local). Quando
   * presente, o caller mostra um modal e o usuário decide.
   */
  onConflict?: (conflict: CloudSyncConflict) => void
  /**
   * ISO-8601 timestamp of the local session's last modification.
   * Comes from SessionRecord.metadata.lastModified of the loaded active session.
   * Pass null when there is no local session saved yet.
   */
  localUpdatedAtIso: string | null
  /**
   * Desative quando uma etapa anterior já exibiu local/nuvem e o host fez a
   * escolha explicitamente. Evita perguntar novamente ou desfazer a escolha.
   */
  reconcileOnEnable?: boolean
}

/**
 * Result returned by forceSync():
 * - 'already-synced' : the session was already fully synced before the call
 * - 'synced'         : the flush succeeded and the session is now synced
 * - 'pending'        : the flush was attempted but the session is still pending
 * - 'disabled'       : sync is not enabled (not logged in / Supabase unconfigured)
 */
export type ForceSyncResult = 'already-synced' | 'synced' | 'pending' | 'disabled'

export function useCloudSync({
  session,
  enabled,
  title,
  onRestore,
  onConflict,
  localUpdatedAtIso,
  reconcileOnEnable = true,
}: UseCloudSyncOptions): {
  status: CloudSyncStatus
  forceSync: () => Promise<ForceSyncResult>
  /**
   * True após falhas consecutivas gravando checkpoints de versão (T4) — o jogo
   * segue salvo, mas o histórico de versões não está ganhando pontos de
   * restauração novos; a UI deve avisar. Volta a false no primeiro sucesso.
   */
  snapshotFailing: boolean
  /** ISO do último sync bem-sucedido nesta sessão de uso; null antes do primeiro. */
  lastSyncedAt: string | null
} {
  // Stable instance for the lifetime of the component
  const syncRef = useRef(createCloudSessionSync())

  // Observable sync status for UI
  const [status, setStatus] = useState<CloudSyncStatus>('local-only')

  // Horário (ISO) do último sync bem-sucedido — para a UI mostrar "· 13:42".
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // Track whether we've already run the initial reconcile for the current
  // enabled=true activation, to avoid re-running on every re-render.
  const reconciledRef = useRef(false)

  // Whether the immediate initial flush already happened for the current
  // activation. Reset when enabled goes false so a re-login flushes again.
  const initialFlushDoneRef = useRef(false)

  // Progresso (cartas respondidas + placar) do último push — usado para
  // detectar eventos significativos de jogo e pular o debounce de 2.5s.
  const lastPushedProgressRef = useRef<{ answered: number; score: number } | null>(null)

  // Timestamp do último checkpoint de versão (T4), para throttle.
  const lastSnapshotAtRef = useRef(0)

  // Falhas CONSECUTIVAS de snapshot. O snapshot é fire-and-forget; sem isso,
  // uma RPC quebrada deixaria o histórico de versões vazio sem ninguém saber.
  const snapshotFailuresRef = useRef(0)
  const [snapshotFailing, setSnapshotFailing] = useState(false)

  // Stable ref to onRestore so the effect doesn't re-run when the callback identity changes
  const onRestoreRef = useRef(onRestore)
  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  // Stable ref to onConflict (same reason as onRestoreRef).
  const onConflictRef = useRef(onConflict)
  useEffect(() => {
    onConflictRef.current = onConflict
  }, [onConflict])

  // Latest session+title+enabled ref — updated every render (sync-with-render
  // pattern) so that forceSync always reads current values with zero deps.
  const latestRef = useRef({ session, title, enabled })
  latestRef.current = { session, title, enabled }

  // forceSync: manual escape-hatch — pushes the latest snapshot immediately.
  // Stable via useCallback([]) — latestRef and syncRef are stable refs.
  // Returns a ForceSyncResult so callers can show contextual feedback.
  const forceSync = useCallback(async (): Promise<ForceSyncResult> => {
    const { enabled: latestEnabled, session: latestSession, title: latestTitle } = latestRef.current
    if (!latestEnabled) return 'disabled'

    // Capture pre-flush state: was it already cleanly synced?
    const wasSynced =
      syncRef.current.getStatus() === 'synced' && !syncRef.current.hasPendingSync()

    syncRef.current.pushSnapshot(latestSession, { title: latestTitle })
    await syncRef.current.flushNow()

    const after = syncRef.current.getStatus()
    if (after === 'synced') {
      return wasSynced ? 'already-synced' : 'synced'
    }
    return 'pending'
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
      lastPushedProgressRef.current = null
    }
  }, [enabled])

  // PULL/RECONCILE: run once per activation
  useEffect(() => {
    if (!enabled) return
    if (reconciledRef.current) return

    reconciledRef.current = true
    if (!reconcileOnEnable) return

    const sync = syncRef.current

    void (async () => {
      try {
        // Passa a sessão local completa: o reconcile decide pelo eventLog
        // (revisão monotônica) quando possível, com fallback na comparação
        // de progresso por cartas respondidas.
        const result = await sync.reconcile(localUpdatedAtIso, latestRef.current.session)

        if (result.action === 'use-cloud' && result.cloudSession) {
          onRestoreRef.current(result.cloudSession)
        } else if (result.action === 'conflict' && result.cloudSession) {
          // Ambíguo (a versão mais nova tem menos progresso). Se houver handler,
          // o usuário decide; senão, fallback SEGURO = mantém o local (nunca
          // perde jogadas silenciosamente) e sobe ele.
          if (onConflictRef.current) {
            onConflictRef.current({
              localSession: latestRef.current.session,
              cloudSession: result.cloudSession,
              localUpdatedAt: localUpdatedAtIso,
              cloudUpdatedAt: result.cloudUpdatedAt ?? null,
            })
          } else {
            sync.pushSnapshot(latestRef.current.session, { title: latestRef.current.title })
            await sync.flushNow()
          }
        } else if (result.action === 'keep-local') {
          // Local is fresher — push it up to align the cloud copy.
          // Usa latestRef (não o `session` do closure) para subir o estado MAIS
          // recente, já que reconcile é async e a sessão pode ter mudado.
          sync.pushSnapshot(latestRef.current.session, { title: latestRef.current.title })
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
  }, [enabled, reconcileOnEnable])

  // PUSH: whenever session changes while enabled (and the session has teams)
  useEffect(() => {
    if (!enabled) return
    if (session.teams.length === 0) return

    // Evento significativo = carta respondida ou placar alterado. Perder isso
    // ao fechar a aba é perder uma jogada; o debounce fica só para edições
    // cosméticas (título, ordem de times etc.).
    const answered = countAnsweredTiles(session.board)
    const score = session.teams.reduce((sum, team) => sum + team.score, 0)
    const prev = lastPushedProgressRef.current
    lastPushedProgressRef.current = { answered, score }
    const significantChange = prev !== null && (answered !== prev.answered || score !== prev.score)

    syncRef.current.pushSnapshot(session, { title })

    // Upload inicial IMEDIATO: no primeiro push de uma ativação (login com uma
    // sessão já montada), faz flushNow em vez de esperar o debounce de 2.5s —
    // assim não fica preso em "Salvo neste navegador" se a sessão não mudar
    // mais, nem é starvado por mudanças frequentes. enabled é checado de forma
    // síncrona aqui, então não há corrida com logout (diferente do reconcile async).
    if (!initialFlushDoneRef.current) {
      initialFlushDoneRef.current = true
      void syncRef.current.flushNow()
    } else if (significantChange) {
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
      setLastSyncedAt(syncRef.current.getLastSyncedAt())
      // Map service SyncStatus → CloudSyncStatus
      // 'idle' before first push = 'local-only' (nothing synced yet)
      if (serviceStatus === 'idle') {
        setStatus('local-only')
      } else if (serviceStatus === 'syncing') {
        setStatus('syncing')
      } else if (serviceStatus === 'synced') {
        setStatus('synced')
        // T4 — checkpoint de versão (throttled ~3min): captura o estado já
        // sincronizado para permitir restaurar uma versão anterior depois.
        // Fire-and-forget; falhas são silenciosas no serviço.
        const { session: snapSession, title: snapTitle } = latestRef.current
        if (
          snapSession.teams.length > 0 &&
          Date.now() - lastSnapshotAtRef.current > SNAPSHOT_THROTTLE_MS
        ) {
          lastSnapshotAtRef.current = Date.now()
          void saveSessionSnapshot(snapSession.id, snapTitle, snapSession).then((result) => {
            if (result === 'failed') {
              snapshotFailuresRef.current += 1
              if (snapshotFailuresRef.current >= SNAPSHOT_FAILURE_ALERT_THRESHOLD) {
                setSnapshotFailing(true)
              }
            } else if (result === 'saved') {
              snapshotFailuresRef.current = 0
              setSnapshotFailing(false)
            }
            // 'skipped' (deslogou no meio) não conta pra nenhum lado.
          })
        }
      } else {
        // 'pending'
        setStatus('pending')
      }
    })

    return unsubscribe
  }, [enabled])

  return { status, forceSync, snapshotFailing, lastSyncedAt }
}
