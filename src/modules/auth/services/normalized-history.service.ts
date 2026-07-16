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
import { readViteEnv } from '../../../shared/services/vite-env'
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

  // Partidas ao vivo usam a chave estavel da TriviaSession. A RPC 0009
  // serializa repeticoes concorrentes e devolve o mesmo game_id. Importacoes
  // continuam na RPC historica, preservando seu contrato.
  const { data, error } =
    opts.source === 'live'
      ? await client.rpc('create_game_normalized_idempotent', {
          p: payload,
          p_session_client_id: session.id,
        })
      : await client.rpc('create_game_normalized', { p: payload })

  if (error) {
    console.warn('[saveNormalizedGame] Falha ao salvar partida normalizada:', error)
    return null
  }

  return data as string
}

// ---------------------------------------------------------------------------
// listMyInvitedContacts — autocomplete de e-mails já convidados pelo host
// ---------------------------------------------------------------------------

export interface InvitedContact {
  email: string
  lastName: string
}

/**
 * Retorna os e-mails que o usuário logado já usou como convite em partidas
 * anteriores (via RPC list_my_invite_contacts, SECURITY INVOKER + RLS owner-only).
 *
 * Não-bloqueante: sempre retorna [] em caso de erro, sem config ou sem sessão.
 * Não expõe nenhuma informação sobre outros usuários — é um espelho dos
 * próprios convites do host, sem flag "tem conta" de terceiros.
 */
export async function listMyInvitedContacts(): Promise<InvitedContact[]> {
  if (!isSupabaseConfigured()) return []

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return []

  try {
    const { data, error } = await client.rpc('list_my_invite_contacts')
    if (error) {
      console.warn('[listMyInvitedContacts] Falha:', error)
      return []
    }
    return ((data ?? []) as Array<{ invite_email: string; last_display_name: string }>).map(
      (row) => ({
        email: row.invite_email,
        lastName: row.last_display_name,
      }),
    )
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// deleteNormalizedGame
// ---------------------------------------------------------------------------

const UUID_RE_DELETE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Exclui permanentemente uma partida pelo ID.
 * Requer que o usuário esteja logado (RLS owner-only).
 * O ON DELETE CASCADE remove times/participantes/filmes/perguntas/score_events/snapshot.
 * Retorna { error: null } em caso de sucesso.
 * No-op/erro-safe quando sem config ou sem login. Nunca lança.
 */
export async function deleteNormalizedGame(gameId: string): Promise<{ error: string | null }> {
  if (!UUID_RE_DELETE.test(gameId)) {
    return { error: 'ID de partida inválido.' }
  }

  if (!isSupabaseConfigured()) {
    return { error: 'Funcionalidade indisponível neste ambiente.' }
  }

  const client = getSupabaseClient()!

  try {
    const { data: { session: authSession } } = await client.auth.getSession()
    if (!authSession?.user) {
      return { error: 'Faça login para excluir partidas.' }
    }

    const { error } = await client
      .from('games')
      .delete()
      .eq('id', gameId)

    if (error) {
      console.warn('[deleteNormalizedGame] Falha ao excluir partida:', error)
      return { error: 'Não foi possível excluir a partida. Tente novamente.' }
    }

    return { error: null }
  } catch {
    return { error: 'Não foi possível excluir a partida. Tente novamente.' }
  }
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
// listClaimableParticipants — lista participantes disponíveis para reivindicar
// via join_token genérico (migration 0006).
// ---------------------------------------------------------------------------

export interface ClaimableParticipant {
  participantId: string
  displayName: string
  teamName: string | null
  claimed: boolean
}

export async function listClaimableParticipants(
  gameToken: string,
): Promise<ClaimableParticipant[]> {
  if (!UUID_RE.test(gameToken)) return []
  if (!isSupabaseConfigured()) return []

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return []

  try {
    const { data, error } = await client.rpc('list_claimable_participants', {
      p_game_token: gameToken,
    })
    if (error) {
      console.warn('[listClaimableParticipants] Falha:', error)
      return []
    }
    return ((data ?? []) as Array<{
      participant_id: string
      display_name: string
      team_name: string | null
      claimed: boolean
    }>).map((row) => ({
      participantId: row.participant_id,
      displayName: row.display_name,
      teamName: row.team_name,
      claimed: row.claimed,
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// claimParticipantByGame — reivindica um participante específico via join_token
// (migration 0006). Mapeia mensagens de erro para pt-BR.
// ---------------------------------------------------------------------------

const CLAIM_BY_GAME_ERRORS: Record<string, string> = {
  INVALID_TOKEN: 'Link de convite inválido.',
  ALREADY_CLAIMED_IN_GAME: 'Você já reivindicou um participante nesta partida.',
  SLOT_UNAVAILABLE: 'Esse participante já foi vinculado por outra pessoa.',
}

export async function claimParticipantByGame(
  gameToken: string,
  participantId: string,
): Promise<{ gameId: string | null; error: string | null }> {
  if (!UUID_RE.test(gameToken) || !UUID_RE.test(participantId)) {
    return { gameId: null, error: 'Link de convite inválido.' }
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
    const { data, error } = await client.rpc('claim_participant_by_game', {
      p_game_token: gameToken,
      p_participant_id: participantId,
    })
    if (error) {
      console.warn('[claimParticipantByGame] Falha:', error)
      const known = Object.keys(CLAIM_BY_GAME_ERRORS).find((k) =>
        (error.message as string | undefined)?.includes(k),
      )
      return {
        gameId: null,
        error: known
          ? CLAIM_BY_GAME_ERRORS[known]
          : 'Não foi possível vincular. Tente novamente.',
      }
    }
    if (!data) {
      return { gameId: null, error: 'Não foi possível vincular. Tente novamente.' }
    }
    return { gameId: data as string, error: null }
  } catch {
    return { gameId: null, error: 'Não foi possível vincular. Tente novamente.' }
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

// ---------------------------------------------------------------------------
// Tipos para getGameDetail
// ---------------------------------------------------------------------------

export interface GameDetailTeam {
  id: string
  client_id: string
  name: string
  color: string | null
  final_score: number
}

export interface GameDetailParticipant {
  id: string
  client_id: string
  display_name: string
  team_id: string | null
  profile_id: string | null
  /** Token de convite para participantes não-vinculados. Só visível para o dono via RLS. */
  claim_token: string | null
}

export interface GameDetailFilm {
  id: string
  client_id: string
  name: string
  order: number
}

export interface GameDetailQuestion {
  id: string
  client_id: string
  film_id: string
  points: number
  question: string | null
  answer: string | null
  state: string
}

export interface ParticipantStat {
  participant_id: string
  participant_client_id?: string
  display_name: string
  team_id: string | null
  team_name: string | null
  profile_id: string | null
  /** Token de convite (visível só ao dono via RLS; null para outros leitores). */
  claim_token: string | null
  trivia_points: number
  mimica_points: number
  total_points: number
}

export interface TimelineEntry {
  event_id: string
  type: 'trivia' | 'mimica'
  occurred_at: string
  actor_participant_id: string | null
  actor_name: string | null
  team_id: string | null
  team_name: string | null
  points: number
  question_id: string | null
  question_text: string | null
  voided: boolean
}

export interface GameDetail {
  id: string
  title: string
  played_at: string | null
  started_at: string | null
  ended_at: string | null
  source: string
  winner_team_id: string | null
  winner_team_name: string | null
  /** Token de convite genérico da sessão. Só presente para o dono (via RLS). */
  joinToken: string | null
  /** true quando o usuário autenticado é o dono do jogo (owner_user_id). */
  isOwner: boolean
  teams: GameDetailTeam[]
  participants: GameDetailParticipant[]
  films: GameDetailFilm[]
  questions: GameDetailQuestion[]
  ranking: ParticipantStat[]
  timeline: TimelineEntry[]
}

// ---------------------------------------------------------------------------
// URL helpers — puros; exportados para testes
// ---------------------------------------------------------------------------

/**
 * Retorna a base normalizada (sempre termina com '/') lida de BASE_URL.
 * Usado internamente por buildClaimUrl e buildSessionClaimUrl.
 */
function getNormalizedBase(): string {
  const base = readViteEnv('BASE_URL') ?? '/'
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * Monta a URL absoluta (ou relativa em ambientes sem window) para um dado path.
 */
function buildAbsoluteUrl(path: string): string {
  const origin =
    typeof window !== 'undefined' ? (window.location?.origin ?? '') : ''

  if (origin) {
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`
  }

  return path
}

/**
 * Monta a URL completa de um link de convite (claim) para um participante.
 *
 * Em ambiente de browser usa window.location.origin + BASE_URL (Vite).
 * Em ambientes sem window (testes SSR / Node) devolve um caminho relativo.
 *
 * Normaliza barras duplas: BASE_URL já deve terminar com '/'; a função
 * evita double-slash entre origin/base e o segmento 'claim'.
 */
export function buildClaimUrl(token: string): string {
  const normalizedBase = getNormalizedBase()
  const path = `${normalizedBase}claim?token=${token}`
  return buildAbsoluteUrl(path)
}

/**
 * Monta a URL completa do convite genérico da sessão (?game=<join_token>).
 * Um único link por jogo — a pessoa loga e escolhe qual participante é.
 */
export function buildSessionClaimUrl(joinToken: string): string {
  const normalizedBase = getNormalizedBase()
  const path = `${normalizedBase}claim?game=${joinToken}`
  return buildAbsoluteUrl(path)
}

// ---------------------------------------------------------------------------
// getGameDetail
// ---------------------------------------------------------------------------

interface ScoreEventRecipientRow {
  id: string
  event_id: string
  team_id: string
  participant_id: string | null
  points: number
}

interface ScoreEventRow {
  id: string
  type: 'trivia' | 'mimica'
  question_id: string | null
  mode: string | null
  turn_number: number | null
  round_number: number | null
  actor_participant_id: string | null
  voided: boolean
  void_reason: string | null
  occurred_at: string
  score_event_recipients: ScoreEventRecipientRow[]
}

interface GameDetailRow {
  id: string
  title: string
  played_at: string | null
  started_at: string | null
  ended_at: string | null
  source: string
  winner_team_id: string | null
  join_token: string | null
  owner_user_id: string | null
  game_teams: Array<{
    id: string
    client_id: string
    name: string
    color: string | null
    final_score: number
  }> | null
  game_participants: Array<{
    id: string
    client_id: string
    display_name: string
    team_id: string | null
    profile_id: string | null
    claim_token: string | null
  }> | null
  game_films: Array<{
    id: string
    client_id: string
    name: string
    order: number
  }> | null
  game_questions: Array<{
    id: string
    client_id: string
    film_id: string
    points: number
    question: string | null
    answer: string | null
    state: string
  }> | null
  score_events: ScoreEventRow[] | null
}

export async function getGameDetail(gameId: string): Promise<GameDetail | null> {
  if (!isSupabaseConfigured()) return null

  const client = getSupabaseClient()!
  const {
    data: { session: authSession },
  } = await client.auth.getSession()

  if (!authSession?.user) return null

  try {
    const { data, error } = await client
      .from('games')
      .select(
        `id,title,played_at,started_at,ended_at,source,winner_team_id,join_token,owner_user_id,
         game_teams!game_teams_game_id_fkey(id,client_id,name,color,final_score),
         game_participants(id,client_id,display_name,team_id,profile_id,claim_token),
         game_films(id,client_id,name,order),
         game_questions(id,client_id,film_id,points,question,answer,state),
         score_events(id,type,question_id,mode,turn_number,round_number,actor_participant_id,voided,void_reason,occurred_at,score_event_recipients(id,event_id,team_id,participant_id,points))`,
      )
      .eq('id', gameId)
      .single()

    if (error) {
      console.warn('[getGameDetail] Falha ao buscar partida:', error)
      return null
    }

    if (!data) return null

    const row = data as GameDetailRow

    const teams: GameDetailTeam[] = (row.game_teams ?? []).map((t) => ({
      id: t.id,
      client_id: t.client_id,
      name: t.name,
      color: t.color,
      final_score: t.final_score,
    }))

    const participants: GameDetailParticipant[] = (row.game_participants ?? []).map((p) => ({
      id: p.id,
      client_id: p.client_id,
      display_name: p.display_name,
      team_id: p.team_id,
      profile_id: p.profile_id,
      claim_token: p.claim_token,
    }))

    const films: GameDetailFilm[] = (row.game_films ?? []).map((f) => ({
      id: f.id,
      client_id: f.client_id,
      name: f.name,
      order: f.order,
    }))

    const questions: GameDetailQuestion[] = (row.game_questions ?? []).map((q) => ({
      id: q.id,
      client_id: q.client_id,
      film_id: q.film_id,
      points: q.points,
      question: q.question,
      answer: q.answer,
      state: q.state,
    }))

    // Build lookup maps
    const teamById = new Map(teams.map((t) => [t.id, t]))
    const participantById = new Map(participants.map((p) => [p.id, p]))
    const questionById = new Map(questions.map((q) => [q.id, q]))

    // Compute ranking from score_event_recipients
    const triviaByParticipant = new Map<string, number>()
    const mimicaByParticipant = new Map<string, number>()

    for (const event of row.score_events ?? []) {
      if (event.voided) continue
      for (const r of event.score_event_recipients ?? []) {
        if (r.participant_id == null) continue
        if (event.type === 'trivia') {
          triviaByParticipant.set(
            r.participant_id,
            (triviaByParticipant.get(r.participant_id) ?? 0) + r.points,
          )
        } else {
          mimicaByParticipant.set(
            r.participant_id,
            (mimicaByParticipant.get(r.participant_id) ?? 0) + r.points,
          )
        }
      }
    }

    const ranking: ParticipantStat[] = participants
      .map((p) => {
        const trivia = triviaByParticipant.get(p.id) ?? 0
        const mimica = mimicaByParticipant.get(p.id) ?? 0
        const team = p.team_id ? teamById.get(p.team_id) : null
        return {
          participant_id: p.id,
          participant_client_id: p.client_id,
          display_name: p.display_name,
          team_id: p.team_id,
          team_name: team?.name ?? null,
          profile_id: p.profile_id,
          claim_token: p.claim_token,
          trivia_points: trivia,
          mimica_points: mimica,
          total_points: trivia + mimica,
        }
      })
      .sort((a, b) => b.total_points - a.total_points)

    // Build timeline
    const timeline: TimelineEntry[] = (row.score_events ?? [])
      .map((event) => {
        // Sum all recipients' points for this event
        const totalPoints = (event.score_event_recipients ?? []).reduce(
          (sum, r) => sum + r.points,
          0,
        )
        const actor = event.actor_participant_id
          ? participantById.get(event.actor_participant_id)
          : null
        const actorTeam = actor?.team_id ? teamById.get(actor.team_id) : null
        // For team attribution we look at the first recipient's team
        const firstRecipient = (event.score_event_recipients ?? [])[0]
        const recipientTeam = firstRecipient?.team_id ? teamById.get(firstRecipient.team_id) : null
        const resolvedTeam = actorTeam ?? recipientTeam ?? null

        const question = event.question_id ? questionById.get(event.question_id) : null

        return {
          event_id: event.id,
          type: event.type,
          occurred_at: event.occurred_at,
          actor_participant_id: event.actor_participant_id,
          actor_name: actor?.display_name ?? null,
          team_id: resolvedTeam?.id ?? null,
          team_name: resolvedTeam?.name ?? null,
          points: totalPoints,
          question_id: event.question_id,
          question_text: question?.question ?? null,
          voided: event.voided,
        }
      })
      .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))

    const winnerTeam = row.winner_team_id ? teamById.get(row.winner_team_id) : null

    const isOwner = row.owner_user_id != null && row.owner_user_id === authSession.user.id

    return {
      id: row.id,
      title: row.title,
      played_at: row.played_at,
      started_at: row.started_at,
      ended_at: row.ended_at,
      source: row.source,
      winner_team_id: row.winner_team_id,
      winner_team_name: winnerTeam?.name ?? null,
      joinToken: isOwner ? (row.join_token ?? null) : null,
      isOwner,
      teams,
      participants,
      films,
      questions,
      ranking,
      timeline,
    }
  } catch (err) {
    console.warn('[getGameDetail] Erro inesperado:', err)
    return null
  }
}
