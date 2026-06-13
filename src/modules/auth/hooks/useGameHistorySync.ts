/**
 * useGameHistorySync
 *
 * Salva o histórico da partida ao fim do jogo, EXCLUSIVAMENTE no modo online
 * e apenas quando o Supabase está configurado e o usuário está logado.
 *
 * Proteções contra duplo-salvamento:
 *  - Ref `savedSessionIdRef` memoriza o sessionId já persistido nesta montagem.
 *  - Só dispara na transição não-terminado → terminado (via flag prevFinished).
 *
 * Falhas de rede são capturadas silenciosamente (console.warn).
 * Modos demo e offline: no-op completo.
 */

import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    // Guard: somente online + supabase configurado + usuário logado
    if (gameMode !== 'online') return
    if (!isSupabaseConfigured()) return
    if (!user) return

    const finished = isGameFinished(session.board)

    // Transição: não-terminado → terminado (primeiro run nunca conta)
    const justFinished = finished && prevFinishedRef.current === false

    // Atualiza o ref para a próxima render
    prevFinishedRef.current = finished

    if (!justFinished) return

    // Proteção: não salvar a mesma sessão duas vezes
    if (savedSessionIdRef.current === session.id) return
    savedSessionIdRef.current = session.id

    saveNormalizedGame(session, { source: 'live' }).catch((err: unknown) => {
      console.warn('[useGameHistorySync] Falha ao salvar histórico:', err)
    })
  }, [session, gameMode, user])
}
