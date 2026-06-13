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
  invite_email?: string
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
  /**
   * Mapa de client_id → invite_email para preencher invite_email nos participantes.
   * Usado no fluxo de importação de sessões locais.
   */
  emailsByClientId?: Record<string, string>
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
  const participants: NormalizedGameParticipant[] = session.participants.map((p) => {
    const inviteEmail = opts.emailsByClientId?.[p.id]
    const isOwner = opts.selfProfileId ? p.id === opts.selfProfileId : false
    return {
      client_id: p.id,
      display_name: p.name,
      role: p.role,
      team_client: p.teamId,
      // profile_id: a RPC auto-vincula via auth.uid() quando selfProfileId bate com client_id.
      // No fluxo live deixamos undefined (a RPC nunca expõe o UUID do caller via payload).
      profile_id: isOwner && opts.selfProfileId ? opts.selfProfileId : undefined,
      invite_email: inviteEmail || undefined,
    }
  })

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
// linkMyParticipations — chama RPC no login para auto-vincular por e-mail
// ---------------------------------------------------------------------------

export async function linkMyParticipations(): Promise<number> {
  if (!isSupabaseConfigured()) return 0

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return 0

  try {
    const { data, error } = await client.rpc('link_my_participations')
    if (error) {
      console.warn('[linkMyParticipations] Falha:', error)
      return 0
    }
    return (data as number | null) ?? 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// claimParticipation — reivindica por token de claim (link de convite)
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function claimParticipation(
  token: string,
): Promise<{ gameId: string | null; error: string | null }> {
  if (!UUID_RE.test(token)) {
    return { gameId: null, error: 'Link inválido ou já utilizado.' }
  }

  if (!isSupabaseConfigured()) {
    return { gameId: null, error: 'Funcionalidade indisponível neste ambiente.' }
  }

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) {
    return { gameId: null, error: 'Faça login para reivindicar esta participação.' }
  }

  try {
    const { data, error } = await client.rpc('claim_participant', { p_token: token })
    if (error) {
      console.warn('[claimParticipation] Falha:', error)
      return { gameId: null, error: 'Link inválido ou já utilizado.' }
    }
    if (!data) {
      return { gameId: null, error: 'Link inválido ou já utilizado.' }
    }
    return { gameId: data as string, error: null }
  } catch {
    return { gameId: null, error: 'Não foi possível processar o link. Tente novamente.' }
  }
}

// ---------------------------------------------------------------------------
// importLocalSession — importa uma sessão local para a conta do usuário
// ---------------------------------------------------------------------------

import type { SessionRecord } from '../../game/infrastructure/session.repository'

export interface ImportLocalSessionOptions {
  /** Mapa client_id → e-mail para associar participantes à conta deles */
  emailsByClientId?: Record<string, string>
  /** ID do profile do usuário logado (para auto-vincular se for participante) */
  selfProfileId?: string | null
}

export async function importLocalSession(
  record: SessionRecord,
  opts?: ImportLocalSessionOptions,
): Promise<{ gameId: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { gameId: null, error: 'Funcionalidade indisponível neste ambiente.' }
  }

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) {
    return { gameId: null, error: 'Faça login para importar sessões.' }
  }

  const nowIso = new Date().toISOString()

  // Garante que nowIso coerente com timestamps do record quando disponíveis
  const payload = buildNormalizedGamePayload(record.session, {
    source: 'import',
    nowIso,
    emailsByClientId: opts?.emailsByClientId,
    selfProfileId: opts?.selfProfileId ?? authSession.user.id,
  })

  try {
    const { data, error } = await client.rpc('create_game_normalized', { p: payload })
    if (error) {
      console.warn('[importLocalSession] Falha ao importar sessão:', error)
      return { gameId: null, error: 'Não foi possível importar a sessão. Tente novamente.' }
    }
    return { gameId: data as string, error: null }
  } catch {
    return { gameId: null, error: 'Não foi possível importar a sessão. Tente novamente.' }
  }
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
