/**
 * useGameHistorySync
 *
 * Salva o histórico da partida ao fim do jogo quando o Supabase está configurado
 * e o usuário está logado — vale para modo offline E online.
 *
 * Proteções contra duplo-salvamento:
 *  - Ref `savedSessionIdRef` memoriza o sessionId já persistido nesta montagem.
 *  - Só dispara na transição não-terminado → terminado (via flag prevFinished).
 *
 * Falhas de rede são capturadas silenciosamente (console.warn).
 * Modo demo: no-op completo.
 * Deslogado ou Supabase não configurado: no-op completo.
 */

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { saveNormalizedGame } from '../services/normalized-history.service'
import { isGameFinished } from '../../game/domain/board.utils'
import type { TriviaSession } from '../../trivia/types'

export interface UseGameHistorySyncOptions {
  /** Sessão atual do trivia */
  session: TriviaSession
  /** Modo de jogo corrente */
  gameMode: string
  /** Usuário autenticado (ou null) */
  user: User | null
}

export function useGameHistorySync({
  session,
  gameMode,
  user,
}: UseGameHistorySyncOptions): void {
  /**
   * Armazena o sessionId da última partida salva nesta montagem do provider.
   * Impede salvamentos duplicados se o board for re-renderizado enquanto
   * permanece terminado.
   */
  const savedSessionIdRef = useRef<string | null>(null)
  /**
   * Guarda o estado finished da render anterior para detectar a transição.
   * null = primeiro run após a montagem: apenas registra o estado, sem salvar.
   * Isso evita re-salvar uma sessão restaurada que já terminou (ex.: reload
   * da página depois do fim do jogo geraria uma entrada duplicada).
   */
  const prevFinishedRef = useRef<boolean | null>(null)
  /** Última tentativa falhou: tenta de novo na próxima mudança da sessão. */
  const retryPendingRef = useRef(false)

  useEffect(() => {
    // Guard: qualquer modo que não seja demo + supabase configurado + usuário logado
    if (gameMode === 'demo') return
    if (!isSupabaseConfigured()) return
    if (!user) return

    const finished = isGameFinished(session.board)

    // Transição: não-terminado → terminado (primeiro run nunca conta).
    // retryPendingRef reabre a janela após uma falha de rede — sem ele, a
    // transição só acontece uma vez e a falha queimava a única tentativa.
    const justFinished = finished && prevFinishedRef.current === false
    const shouldRetry = finished && retryPendingRef.current

    // Atualiza o ref para a próxima render
    prevFinishedRef.current = finished

    if (!justFinished && !shouldRetry) return
    retryPendingRef.current = false

    // Proteção: não salvar a mesma sessão duas vezes
    if (savedSessionIdRef.current === session.id) return
    // Marca ANTES para bloquear re-entradas concorrentes; em falha, limpamos
    // abaixo para o próximo evento tentar de novo (antes, uma falha de rede
    // queimava a única tentativa em silêncio).
    savedSessionIdRef.current = session.id

    // Monta mapa clientId → e-mail para participantes que têm e-mail preenchido
    const emailsByClientId: Record<string, string> = {}
    for (const participant of session.participants) {
      if (participant.email) {
        emailsByClientId[participant.id] = participant.email
      }
    }

    saveNormalizedGame(session, {
      source: 'live',
      ...(Object.keys(emailsByClientId).length > 0 ? { emailsByClientId } : {}),
    }).then((gameId) => {
      if (gameId) return
      // null = RPC falhou (rede/RLS). Libera para nova tentativa e avisa —
      // o host precisa saber que o histórico da partida não subiu.
      savedSessionIdRef.current = null
      retryPendingRef.current = true
      toast.error('A partida terminou, mas não consegui salvar no seu histórico.', {
        id: 'history-save-failed',
        description: 'Confira a conexão — tento de novo automaticamente.',
        duration: 10000,
      })
    }).catch((err: unknown) => {
      console.warn('[useGameHistorySync] Falha ao salvar histórico:', err)
      savedSessionIdRef.current = null
      retryPendingRef.current = true
    })
  }, [session, gameMode, user])
}
