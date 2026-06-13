/**
 * normalized-history.service.ts
 *
 * Persistência normalizada de partidas via RPC create_game_normalized (migration 0004).
 * Substitui o modelo flat de game_history (history.service.ts, legado ainda ativo).
 *
 * Três exports principais:
 *  - buildNormalizedGamePayload  — função PURA, testável sem Supabase
 *  - saveNormalizedGame          — chama a RPC; no-op silencioso se não configurado/deslogado
 *  - listNormalizedGames         — lista últimas 20 partidas; no-op [] se não configurado/deslogado
 */

import { getSupabaseClient, isSupabaseConfigured } from '../../../shared/services/supabase.client'
import type { TriviaSession } from '../../trivia/types'

// ---------------------------------------------------------------------------
// Tipos de saída do builder / do serviço de listagem
// ---------------------------------------------------------------------------

export interface NormalizedGameTeam {
  client_id: string
  name: string
  color: string
  order: number
  final_score: number
}

export interface NormalizedGameParticipant {
  client_id: string
  display_name: string
  role: string
  team_client?: string
  profile_id?: string
}

export interface NormalizedGameFilm {
  client_id: string
  name: string
  order: number
}

export interface NormalizedGameQuestion {
  client_id: string
  film_client: string
  points: number
  question?: string
  answer?: string
  state: string
}

export interface NormalizedEventRecipient {
  team_client: string
  participant_client?: string
  points: number
}

export interface NormalizedScoreEvent {
  type: 'trivia' | 'mimica'
  question_client?: string
  mode?: string
  turn?: number
  round?: number
  actor_client?: string
  voided: boolean
  void_reason?: string
  occurred_at: string
  recipients: NormalizedEventRecipient[]
}

export interface NormalizedGamePayload {
  game: {
    title: string
    status: string
    source: 'live' | 'import'
    played_at?: string
    started_at?: string
    ended_at?: string
  }
  snapshot: TriviaSession
  source_ref: string
  teams: NormalizedGameTeam[]
  participants: NormalizedGameParticipant[]
  films: NormalizedGameFilm[]
  questions: NormalizedGameQuestion[]
  events: NormalizedScoreEvent[]
  winner_client?: string
}

export interface NormalizedGameSummaryTeam {
  name: string
  score: number
}

export interface NormalizedGameSummary {
  id: string
  title: string
  playedAt: string | null
  endedAt: string | null
  winner: string | null
  source: string
  teams: NormalizedGameSummaryTeam[]
}

// ---------------------------------------------------------------------------
// Opções do builder
// ---------------------------------------------------------------------------

export interface BuildNormalizedGamePayloadOptions {
  source: 'live' | 'import'
  selfProfileId?: string | null
  /** ISO string para "agora" — recebido de fora para que a função permaneça pura */
  nowIso?: string
}

// ---------------------------------------------------------------------------
// buildNormalizedGamePayload — função PURA
// ---------------------------------------------------------------------------

export function buildNormalizedGamePayload(
  session: TriviaSession,
  opts: BuildNormalizedGamePayloadOptions,
): NormalizedGamePayload {
  const nowIso = opts.nowIso ?? new Date(0).toISOString() // fallback seguro; caller deve passar

  // ── teams ────────────────────────────────────────────────────────────────
  const teams: NormalizedGameTeam[] = session.teams.map((t, idx) => ({
    client_id: t.id,
    name: t.name,
    color: t.color,
    order: t.order ?? idx,
    final_score: t.score,
  }))

  // ── participants ──────────────────────────────────────────────────────────
  const participants: NormalizedGameParticipant[] = session.participants.map((p) => ({
    client_id: p.id,
    display_name: p.name,
    role: p.role,
    team_client: p.teamId,
    // profile_id sempre undefined no fluxo live — a RPC auto-vincula via auth.uid()
    // quando o payload tiver profile_id === auth.uid(); por ora deixamos undefined.
    profile_id: undefined,
  }))

  // ── films e questions ─────────────────────────────────────────────────────
  const films: NormalizedGameFilm[] = []
  const questions: NormalizedGameQuestion[] = []

  session.board.forEach((col, colIdx) => {
    films.push({
      client_id: col.id,
      name: col.film,
      order: colIdx,
    })

    col.tiles.forEach((tile) => {
      questions.push({
        client_id: tile.id,
        film_client: col.id,
        points: tile.points,
        question: tile.question,
        answer: tile.answer,
        state: tile.state,
      })
    })
  })

  // ── events ────────────────────────────────────────────────────────────────
  const events: NormalizedScoreEvent[] = []

  // Eventos derivados dos tiles respondidos no board
  for (const col of session.board) {
    for (const tile of col.tiles) {
      if (tile.state !== 'answered') continue

      if (tile.answeredBy) {
        // Tile respondido com registro de quem acertou
        const ab = tile.answeredBy
        events.push({
          type: 'trivia',
          question_client: tile.id,
          turn: ab.turnNumber,
          round: ab.roundNumber,
          actor_client: ab.participantId,
          voided: false,
          occurred_at: ab.timestamp,
          recipients: [
            {
              team_client: ab.teamId,
              participant_client: ab.participantId,
              points: ab.pointsAwarded,
            },
          ],
        })
      } else {
        // Tile marcado como answered mas sem registro de destinatário — evento voided
        events.push({
          type: 'trivia',
          question_client: tile.id,
          voided: true,
          void_reason: 'respondida sem registro de destinatario',
          occurred_at: nowIso,
          recipients: [],
        })
      }
    }
  }

  // Eventos derivados dos mimicaScores
  for (const ms of session.mimicaScores ?? []) {
    const isVoid = ms.mode === 'void'
    events.push({
      type: 'mimica',
      mode: ms.mode,
      turn: ms.turnNumber,
      round: ms.roundNumber,
      actor_client: ms.participantId,
      voided: isVoid,
      occurred_at: ms.timestamp,
      recipients: isVoid
        ? []
        : [
            {
              team_client: ms.teamId,
              participant_client: ms.participantId,
              points: ms.pointsAwarded,
            },
          ],
    })
  }

  // ── started_at / ended_at — min/max dos timestamps dos eventos ──────────
  const allTimestamps = events
    .filter((e) => !e.voided || e.void_reason !== 'respondida sem registro de destinatario')
    .map((e) => e.occurred_at)
    .filter(Boolean)

  let startedAt: string | undefined
  let endedAt: string | undefined

  if (allTimestamps.length > 0) {
    const sorted = [...allTimestamps].sort()
    startedAt = sorted[0]
    endedAt = sorted[sorted.length - 1]
  } else {
    // Sem timestamps reais — fallback para nowIso passado de fora
    startedAt = nowIso
    endedAt = nowIso
  }

  // ── winner_client ────────────────────────────────────────────────────────
  let winnerClient: string | undefined
  if (teams.length > 0) {
    const maxScore = Math.max(...teams.map((t) => t.final_score))
    const topTeams = teams.filter((t) => t.final_score === maxScore)
    if (topTeams.length === 1) {
      winnerClient = topTeams[0].client_id
    }
    // empate → undefined (omitido)
  }

  // ── payload final ────────────────────────────────────────────────────────
  return {
    game: {
      title: session.title,
      status: 'finished',
      source: opts.source,
      played_at: session.scheduledAt || undefined,
      started_at: startedAt,
      ended_at: endedAt,
    },
    snapshot: session,
    source_ref: opts.source === 'live' ? 'live-session' : 'import',
    teams,
    participants,
    films,
    questions,
    events,
    winner_client: winnerClient,
  }
}

// ---------------------------------------------------------------------------
// saveNormalizedGame
// ---------------------------------------------------------------------------

export async function saveNormalizedGame(
  session: TriviaSession,
  opts: BuildNormalizedGamePayloadOptions,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return null

  const nowIso = new Date().toISOString()
  const payload = buildNormalizedGamePayload(session, { ...opts, nowIso })

  const { data, error } = await client.rpc('create_game_normalized', { p: payload })

  if (error) {
    console.warn('[saveNormalizedGame] Falha ao salvar partida normalizada:', error)
    return null
  }

  return data as string
}

// ---------------------------------------------------------------------------
// listNormalizedGames
// ---------------------------------------------------------------------------

export async function listNormalizedGames(): Promise<NormalizedGameSummary[]> {
  if (!isSupabaseConfigured()) return []

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return []

  const { data, error } = await client
    .from('games')
    // game_teams!game_teams_game_id_fkey: o embed precisa ser desambiguado
    // porque games tem DUAS relações com game_teams (pertencimento via
    // game_teams.game_id e vencedor via games.winner_team_id).
    .select(
      'id,title,played_at,ended_at,source,winner_team_id,game_teams!game_teams_game_id_fkey(id,name,final_score)',
    )
    .order('played_at', { ascending: false })
    .limit(20)

  if (error) {
    console.warn('[listNormalizedGames] Falha ao listar partidas:', error)
    return []
  }

  return ((data ?? []) as NormalizedGamesRow[]).map((row) => {
    const teamsList: NormalizedGameSummaryTeam[] = ((row.game_teams as GameTeamRow[]) ?? []).map(
      (t) => ({
        name: t.name,
        score: t.final_score,
      }),
    )

    const winnerTeam = row.winner_team_id
      ? ((row.game_teams as GameTeamRow[]) ?? []).find((t) => t.id === row.winner_team_id)
      : null

    return {
      id: row.id,
      title: row.title,
      playedAt: row.played_at ?? null,
      endedAt: row.ended_at ?? null,
      winner: winnerTeam?.name ?? null,
      source: row.source,
      teams: teamsList,
    }
  })
}

// ---------------------------------------------------------------------------
// Tipos internos para a query de listagem
// ---------------------------------------------------------------------------

interface GameTeamRow {
  id: string
  name: string
  final_score: number
}

interface NormalizedGamesRow {
  id: string
  title: string
  played_at: string | null
  ended_at: string | null
  source: string
  winner_team_id: string | null
  game_teams: GameTeamRow[] | null
}
