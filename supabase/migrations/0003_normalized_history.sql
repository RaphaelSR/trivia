-- =============================================================================
-- Migration 0003: normalized_history
-- Modelo normalizado do histórico de partidas (fase 3 antecipada).
-- games + tabelas filhas com ligações reais, snapshot lossless em tabela
-- própria, e eventos de pontuação com distribuição COMPLETA (FINDING-008:
-- distribuições multi-time não deixavam rastro no modelo antigo).
-- RLS: escrita owner-only; leitura para owner E participantes vinculados.
-- Idempotente. Execute no SQL Editor do painel do Supabase.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- games — uma partida. Núcleo do modelo.
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id             uuid        primary key default gen_random_uuid(),
  -- Dono/escritor da partida. A persistência normalizada é sempre por conta.
  owner_user_id  uuid        not null references auth.users(id) on delete cascade,
  title          text        not null,
  status         text        not null default 'finished'
                             check (status in ('lobby', 'active', 'finished')),
  -- source: como a partida entrou no sistema.
  source         text        not null default 'live'
                             check (source in ('live', 'import')),
  -- played_at: data informacional do jogo (agrupamento futuro é via championships).
  played_at      timestamptz,
  -- started_at/ended_at: derivados do primeiro/último evento real
  -- (corrige a "duration" enganosa do modelo offline).
  started_at     timestamptz,
  ended_at       timestamptz,
  -- Vencedor; FK adicionada após a criação de game_teams (referência circular).
  winner_team_id uuid,
  created_at     timestamptz not null default now()
);

comment on table public.games is
  'Partida normalizada. Pertence a owner_user_id. started_at/ended_at vêm dos eventos reais.';

create index if not exists games_owner_played_idx
  on public.games (owner_user_id, played_at desc);

-- ---------------------------------------------------------------------------
-- game_raw_snapshots — arquivo LOSSLESS do TriviaSession original (1:1).
-- Separado de games para listagens não carregarem o JSON pesado.
-- ---------------------------------------------------------------------------
create table if not exists public.game_raw_snapshots (
  game_id     uuid        primary key references public.games(id) on delete cascade,
  snapshot    jsonb       not null,
  -- Origem do snapshot, para rastrear importações (ex.: 'backup-2026-06-12.json').
  source_ref  text,
  created_at  timestamptz not null default now()
);

comment on table public.game_raw_snapshots is
  'Cópia integral e imutável do TriviaSession. Fonte de verdade para reprocessar o modelo normalizado.';

-- ---------------------------------------------------------------------------
-- game_teams — equipes da partida.
-- ---------------------------------------------------------------------------
create table if not exists public.game_teams (
  id           uuid        primary key default gen_random_uuid(),
  game_id      uuid        not null references public.games(id) on delete cascade,
  -- id do time no client (ex.: team-19e56...). Permite mapear eventos na importação.
  client_id    text        not null,
  name         text        not null,
  color        text,
  "order"      int         not null default 0,
  -- Score final autoritativo. SUM(score_event_recipients.points) deve reconciliar.
  final_score  int         not null default 0,
  created_at   timestamptz not null default now(),
  unique (game_id, client_id)
);

create index if not exists game_teams_game_idx on public.game_teams (game_id);

-- FK de games.winner_team_id (criada aqui porque game_teams precisa existir antes).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'games_winner_team_fk') then
    alter table public.games
      add constraint games_winner_team_fk
      foreign key (winner_team_id) references public.game_teams(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- game_participants — pessoa numa partida (apelido). profile_id = vínculo
-- com conta (null até reivindicar); claim_token para reivindicação futura.
-- ---------------------------------------------------------------------------
create table if not exists public.game_participants (
  id            uuid        primary key default gen_random_uuid(),
  game_id       uuid        not null references public.games(id) on delete cascade,
  team_id       uuid        references public.game_teams(id) on delete set null,
  client_id     text        not null,
  -- Apelido digitado pelo host (PII mínima).
  display_name  text        not null,
  role          text        not null default 'player'
                            check (role in ('host', 'assistant', 'player')),
  profile_id    uuid        references public.profiles(id) on delete set null,
  -- Anulado (set null) ao vincular, para impedir reuso.
  claim_token   uuid        unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  unique (game_id, client_id)
);

create index if not exists game_participants_game_idx on public.game_participants (game_id);
-- Índice crítico para a RLS de leitura por participante vinculado e leaderboards.
create index if not exists game_participants_profile_idx
  on public.game_participants (profile_id) where profile_id is not null;

comment on column public.game_participants.profile_id is
  'Conta vinculada a este participante. NULL = não reivindicado. Usado na RLS de leitura.';

-- ---------------------------------------------------------------------------
-- game_films — colunas/filmes do board.
-- ---------------------------------------------------------------------------
create table if not exists public.game_films (
  id          uuid        primary key default gen_random_uuid(),
  game_id     uuid        not null references public.games(id) on delete cascade,
  client_id   text        not null,
  name        text        not null,
  "order"     int         not null default 0,
  created_at  timestamptz not null default now(),
  unique (game_id, client_id)
);

create index if not exists game_films_game_idx on public.game_films (game_id);

-- ---------------------------------------------------------------------------
-- game_questions — tiles (pergunta/resposta/pontos) por filme.
-- ---------------------------------------------------------------------------
create table if not exists public.game_questions (
  id           uuid        primary key default gen_random_uuid(),
  game_id      uuid        not null references public.games(id) on delete cascade,
  film_id      uuid        not null references public.game_films(id) on delete cascade,
  client_id    text        not null,
  points       int         not null,
  question     text,
  answer       text,
  state        text        not null default 'available'
                           check (state in ('available', 'active', 'answered')),
  created_at   timestamptz not null default now(),
  unique (game_id, client_id)
);

create index if not exists game_questions_game_idx on public.game_questions (game_id);
create index if not exists game_questions_film_idx on public.game_questions (film_id);

-- ---------------------------------------------------------------------------
-- score_events — cabeçalho de cada evento de pontuação (trivia OU mimica).
-- A distribuição de pontos vive em score_event_recipients (1 → N).
-- ---------------------------------------------------------------------------
create table if not exists public.score_events (
  id                   uuid        primary key default gen_random_uuid(),
  game_id              uuid        not null references public.games(id) on delete cascade,
  type                 text        not null check (type in ('trivia', 'mimica')),
  -- Presente em eventos de trivia; NULL em mimica.
  question_id          uuid        references public.game_questions(id) on delete set null,
  -- Modo de mimica; NULL para trivia. 'void' = anulação.
  mode                 text        check (mode in
                         ('full-current', 'half-current', 'steal', 'everyone', 'void')),
  turn_number          int,
  round_number         int,
  -- Quem jogou o turno (pode ser NULL em anulações/ajustes sem ator).
  actor_participant_id uuid        references public.game_participants(id) on delete set null,
  -- Evento anulado ou de ajuste: mantém o rastro que o modelo antigo perdia.
  voided               boolean     not null default false,
  void_reason          text,
  occurred_at          timestamptz not null,
  created_at           timestamptz not null default now(),
  constraint score_events_trivia_has_question
    check (type <> 'trivia' or question_id is not null or voided),
  constraint score_events_mimica_has_mode
    check (type <> 'mimica' or mode is not null)
);

create index if not exists score_events_game_idx      on public.score_events (game_id);
create index if not exists score_events_question_idx  on public.score_events (question_id);
create index if not exists score_events_game_time_idx on public.score_events (game_id, occurred_at);

comment on table public.score_events is
  'Evento de pontuação (trivia/mimica/ajuste). Distribuição completa em score_event_recipients (FINDING-008).';

-- ---------------------------------------------------------------------------
-- score_event_recipients — distribuição completa: 1 evento → N destinatários.
-- Coração da correção do FINDING-008.
-- ---------------------------------------------------------------------------
create table if not exists public.score_event_recipients (
  id             uuid        primary key default gen_random_uuid(),
  event_id       uuid        not null references public.score_events(id) on delete cascade,
  team_id        uuid        not null references public.game_teams(id) on delete cascade,
  participant_id uuid        references public.game_participants(id) on delete set null,
  -- 0 é permitido (anulação registrada explicitamente).
  points         int         not null,
  created_at     timestamptz not null default now()
);

create index if not exists ser_event_idx       on public.score_event_recipients (event_id);
create index if not exists ser_team_idx        on public.score_event_recipients (team_id);
create index if not exists ser_participant_idx on public.score_event_recipients (participant_id)
  where participant_id is not null;

comment on table public.score_event_recipients is
  'Distribuição de pontos de um evento. SUM(points) por team_id reconcilia com game_teams.final_score.';

-- =============================================================================
-- RLS
-- Helpers SECURITY DEFINER: evitam recursão de policy e centralizam a regra.
-- =============================================================================

-- Pode o usuário atual LER esta partida? Owner OU participante vinculado.
create or replace function public.is_game_reader(p_game_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id and g.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.game_participants gp
    where gp.game_id = p_game_id and gp.profile_id = auth.uid()
  );
$$;

-- É o owner desta partida? (escrita)
create or replace function public.is_game_owner(p_game_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id and g.owner_user_id = auth.uid()
  );
$$;

-- ===== games =====
alter table public.games enable row level security;

drop policy if exists "games_select_reader" on public.games;
create policy "games_select_reader" on public.games for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from public.game_participants gp
      where gp.game_id = id and gp.profile_id = auth.uid()
    )
  );

drop policy if exists "games_insert_owner" on public.games;
create policy "games_insert_owner" on public.games for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "games_update_owner" on public.games;
create policy "games_update_owner" on public.games for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "games_delete_owner" on public.games;
create policy "games_delete_owner" on public.games for delete
  using (owner_user_id = auth.uid());

-- ===== tabelas filhas com game_id direto =====
-- Padrão: SELECT para reader (owner + participante vinculado); ALL para owner.

alter table public.game_raw_snapshots enable row level security;
drop policy if exists "raw_select_reader" on public.game_raw_snapshots;
create policy "raw_select_reader" on public.game_raw_snapshots for select
  using (public.is_game_reader(game_id));
drop policy if exists "raw_write_owner" on public.game_raw_snapshots;
create policy "raw_write_owner" on public.game_raw_snapshots for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

alter table public.game_teams enable row level security;
drop policy if exists "game_teams_select_reader" on public.game_teams;
create policy "game_teams_select_reader" on public.game_teams for select
  using (public.is_game_reader(game_id));
drop policy if exists "game_teams_write_owner" on public.game_teams;
create policy "game_teams_write_owner" on public.game_teams for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

alter table public.game_participants enable row level security;
drop policy if exists "game_participants_select_reader" on public.game_participants;
create policy "game_participants_select_reader" on public.game_participants for select
  using (public.is_game_reader(game_id));
drop policy if exists "game_participants_write_owner" on public.game_participants;
create policy "game_participants_write_owner" on public.game_participants for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

alter table public.game_films enable row level security;
drop policy if exists "game_films_select_reader" on public.game_films;
create policy "game_films_select_reader" on public.game_films for select
  using (public.is_game_reader(game_id));
drop policy if exists "game_films_write_owner" on public.game_films;
create policy "game_films_write_owner" on public.game_films for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

alter table public.game_questions enable row level security;
drop policy if exists "game_questions_select_reader" on public.game_questions;
create policy "game_questions_select_reader" on public.game_questions for select
  using (public.is_game_reader(game_id));
drop policy if exists "game_questions_write_owner" on public.game_questions;
create policy "game_questions_write_owner" on public.game_questions for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

alter table public.score_events enable row level security;
drop policy if exists "score_events_select_reader" on public.score_events;
create policy "score_events_select_reader" on public.score_events for select
  using (public.is_game_reader(game_id));
drop policy if exists "score_events_write_owner" on public.score_events;
create policy "score_events_write_owner" on public.score_events for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

-- ===== score_event_recipients (sem game_id; resolve via event_id) =====
alter table public.score_event_recipients enable row level security;
drop policy if exists "ser_select_reader" on public.score_event_recipients;
create policy "ser_select_reader" on public.score_event_recipients for select
  using (exists (
    select 1 from public.score_events se
    where se.id = event_id and public.is_game_reader(se.game_id)
  ));
drop policy if exists "ser_write_owner" on public.score_event_recipients;
create policy "ser_write_owner" on public.score_event_recipients for all
  using (exists (
    select 1 from public.score_events se
    where se.id = event_id and public.is_game_owner(se.game_id)
  ))
  with check (exists (
    select 1 from public.score_events se
    where se.id = event_id and public.is_game_owner(se.game_id)
  ));
