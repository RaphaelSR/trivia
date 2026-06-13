-- =============================================================================
-- Migration 0005: participant_linking
-- Vínculo participante → conta por dois caminhos:
--   (1) E-mail (host informa no setup/importação) → auto-vínculo no login.
--   (2) claim_token (link/código) → reivindicação manual. (coluna já existe em 0003)
--
-- PRIVACIDADE: e-mails de terceiros ficam em tabela SEPARADA (participant_invites)
-- com RLS owner-only, para que participantes vinculados a um jogo NÃO consigam ler
-- os e-mails dos demais via a policy de leitura de game_participants.
-- O matching por e-mail é feito SERVER-SIDE em função SECURITY DEFINER que compara
-- com o e-mail do próprio usuário logado — nenhuma lista de e-mails é exposta.
--
-- Idempotente. Execute no SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- participant_invites — e-mail convidado por participante (PII, owner-only).
-- ---------------------------------------------------------------------------
create table if not exists public.participant_invites (
  participant_id uuid        primary key references public.game_participants(id) on delete cascade,
  -- game_id denormalizado para a checagem de owner na RLS.
  game_id        uuid        not null references public.games(id) on delete cascade,
  invite_email   text        not null,
  created_at     timestamptz not null default now()
);

comment on table public.participant_invites is
  'E-mail convidado por participante (PII). RLS owner-only. O auto-vínculo lê via função SECURITY DEFINER, nunca expondo e-mails de terceiros aos clientes.';

-- Índice para o matching por e-mail (case-insensitive).
create index if not exists participant_invites_email_idx
  on public.participant_invites (lower(invite_email));
create index if not exists participant_invites_game_idx
  on public.participant_invites (game_id);

alter table public.participant_invites enable row level security;

-- Owner-only em TODAS as operações: só quem é dono do jogo lê/escreve os e-mails.
drop policy if exists "participant_invites_owner_all" on public.participant_invites;
create policy "participant_invites_owner_all" on public.participant_invites for all
  using (public.is_game_owner(game_id))
  with check (public.is_game_owner(game_id));

-- ---------------------------------------------------------------------------
-- link_my_participations() — auto-vínculo no login.
-- Vincula ao usuário atual todos os participantes (ainda sem dono) cujo
-- invite_email bate com o e-mail do próprio usuário logado.
-- SECURITY DEFINER: lê participant_invites de jogos de OUTROS donos (necessário),
-- mas só usa o e-mail do CALLER (auth.email()) como filtro — não vaza nada.
-- Retorna a quantidade de participações vinculadas.
-- ---------------------------------------------------------------------------
create or replace function public.link_my_participations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := auth.email();
  v_count integer;
begin
  if v_uid is null or v_email is null then
    return 0;
  end if;

  with linked as (
    update public.game_participants gp
    set profile_id = v_uid
    from public.participant_invites pi
    where pi.participant_id = gp.id
      and lower(pi.invite_email) = lower(v_email)
      and gp.profile_id is null
    returning gp.id
  )
  select count(*) into v_count from linked;

  return coalesce(v_count, 0);
end;
$$;

revoke execute on function public.link_my_participations() from public, anon;
grant execute on function public.link_my_participations() to authenticated;

-- ---------------------------------------------------------------------------
-- claim_participant(token) — reivindicação por link/código.
-- Vincula ao usuário atual o participante de claim_token informado, se ainda
-- não reivindicado. SECURITY DEFINER porque o reivindicador não é o dono do jogo
-- (a RLS de game_participants é owner-only para escrita). Anula o token no uso.
-- Retorna o game_id vinculado, ou null se token inválido/já usado.
-- ---------------------------------------------------------------------------
create or replace function public.claim_participant(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_game uuid;
begin
  if v_uid is null then
    raise exception 'claim_participant requer usuário autenticado';
  end if;

  update public.game_participants
  set profile_id = v_uid,
      claim_token = null
  where claim_token = p_token
    and profile_id is null
  returning game_id into v_game;

  return v_game;
end;
$$;

revoke execute on function public.claim_participant(uuid) from public, anon;
grant execute on function public.claim_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_game_normalized: estende para gravar invite_email por participante.
-- Recriação completa da função 0004 + bloco de participant_invites.
-- ---------------------------------------------------------------------------
create or replace function public.create_game_normalized(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game_id  uuid;
  v_tmap     jsonb := '{}'::jsonb;
  v_pmap     jsonb := '{}'::jsonb;
  v_fmap     jsonb := '{}'::jsonb;
  v_qmap     jsonb := '{}'::jsonb;
  rec        jsonb;
  r2         jsonb;
  v_id       uuid;
  v_event_id uuid;
  v_email    text;
begin
  if auth.uid() is null then
    raise exception 'create_game_normalized requer usuário autenticado';
  end if;

  insert into public.games (owner_user_id, title, status, source, played_at, started_at, ended_at)
  values (
    auth.uid(),
    coalesce(p->'game'->>'title', 'Partida'),
    coalesce(p->'game'->>'status', 'finished'),
    coalesce(p->'game'->>'source', 'live'),
    nullif(p->'game'->>'played_at', '')::timestamptz,
    nullif(p->'game'->>'started_at', '')::timestamptz,
    nullif(p->'game'->>'ended_at', '')::timestamptz
  )
  returning id into v_game_id;

  if p ? 'snapshot' then
    insert into public.game_raw_snapshots (game_id, snapshot, source_ref)
    values (v_game_id, p->'snapshot', p->>'source_ref');
  end if;

  for rec in select * from jsonb_array_elements(coalesce(p->'teams', '[]'::jsonb)) loop
    insert into public.game_teams (game_id, client_id, name, color, "order", final_score)
    values (
      v_game_id, rec->>'client_id', rec->>'name', rec->>'color',
      coalesce((rec->>'order')::int, 0), coalesce((rec->>'final_score')::int, 0)
    )
    returning id into v_id;
    v_tmap := v_tmap || jsonb_build_object(rec->>'client_id', v_id);
  end loop;

  for rec in select * from jsonb_array_elements(coalesce(p->'participants', '[]'::jsonb)) loop
    insert into public.game_participants (game_id, client_id, display_name, role, team_id, profile_id)
    values (
      v_game_id, rec->>'client_id', rec->>'display_name',
      coalesce(rec->>'role', 'player'),
      (v_tmap->>(rec->>'team_client'))::uuid,
      case when rec->>'profile_id' = auth.uid()::text then auth.uid() else null end
    )
    returning id into v_id;
    v_pmap := v_pmap || jsonb_build_object(rec->>'client_id', v_id);

    -- invite_email opcional → tabela separada (PII owner-only).
    v_email := nullif(trim(rec->>'invite_email'), '');
    if v_email is not null then
      insert into public.participant_invites (participant_id, game_id, invite_email)
      values (v_id, v_game_id, lower(v_email))
      on conflict (participant_id) do update set invite_email = excluded.invite_email;
    end if;
  end loop;

  for rec in select * from jsonb_array_elements(coalesce(p->'films', '[]'::jsonb)) loop
    insert into public.game_films (game_id, client_id, name, "order")
    values (v_game_id, rec->>'client_id', rec->>'name', coalesce((rec->>'order')::int, 0))
    returning id into v_id;
    v_fmap := v_fmap || jsonb_build_object(rec->>'client_id', v_id);
  end loop;

  for rec in select * from jsonb_array_elements(coalesce(p->'questions', '[]'::jsonb)) loop
    insert into public.game_questions (game_id, client_id, film_id, points, question, answer, state)
    values (
      v_game_id, rec->>'client_id',
      (v_fmap->>(rec->>'film_client'))::uuid,
      coalesce((rec->>'points')::int, 0),
      rec->>'question', rec->>'answer',
      coalesce(rec->>'state', 'available')
    )
    returning id into v_id;
    v_qmap := v_qmap || jsonb_build_object(rec->>'client_id', v_id);
  end loop;

  for rec in select * from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) loop
    insert into public.score_events
      (game_id, type, question_id, mode, turn_number, round_number,
       actor_participant_id, voided, void_reason, occurred_at)
    values (
      v_game_id,
      rec->>'type',
      (v_qmap->>(rec->>'question_client'))::uuid,
      rec->>'mode',
      (rec->>'turn')::int,
      (rec->>'round')::int,
      (v_pmap->>(rec->>'actor_client'))::uuid,
      coalesce((rec->>'voided')::boolean, false),
      rec->>'void_reason',
      (rec->>'occurred_at')::timestamptz
    )
    returning id into v_event_id;

    for r2 in select * from jsonb_array_elements(coalesce(rec->'recipients', '[]'::jsonb)) loop
      insert into public.score_event_recipients (event_id, team_id, participant_id, points)
      values (
        v_event_id,
        (v_tmap->>(r2->>'team_client'))::uuid,
        (v_pmap->>(r2->>'participant_client'))::uuid,
        coalesce((r2->>'points')::int, 0)
      );
    end loop;
  end loop;

  if coalesce(p->>'winner_client', '') <> '' then
    update public.games
    set winner_team_id = (v_tmap->>(p->>'winner_client'))::uuid
    where id = v_game_id;
  end if;

  return v_game_id;
end;
$$;

revoke execute on function public.create_game_normalized(jsonb) from public, anon;
grant execute on function public.create_game_normalized(jsonb) to authenticated;
