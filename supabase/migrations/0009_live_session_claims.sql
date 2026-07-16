-- =============================================================================
-- Migration 0009: live_session_claims
-- Um convite permanente por sessao online, claims auditaveis e finalizacao
-- normalizada idempotente.
--
-- Compatibilidade e seguranca operacional:
--   * NAO substitui create_game_normalized(jsonb), claim_participant(uuid),
--     claim_participant_by_game(uuid, uuid) ou link_my_participations().
--   * NAO faz backfill amplo e NAO arquiva online_sessions. Dados e restauracao
--     existentes permanecem com o mesmo comportamento.
--   * A nova finalizacao usa (owner_user_id, source_session_id) como chave
--     estavel e um advisory lock transacional para repeticoes concorrentes.
--   * Claims ficam fora do JSON da TriviaSession e toda mutacao passa por RPC.
--
-- Idempotente no DDL. Execute no SQL Editor antes de publicar o frontend.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identidade estavel da sessao ao vivo e do jogo normalizado.
-- ---------------------------------------------------------------------------
alter table public.online_sessions
  add column if not exists join_token uuid not null default gen_random_uuid(),
  add column if not exists invite_session_id text;

create unique index if not exists online_sessions_join_token_idx
  on public.online_sessions (join_token);

comment on column public.online_sessions.join_token is
  'Capability do convite ao vivo. Rotacionada quando o snapshot passa a representar outra TriviaSession.';
comment on column public.online_sessions.invite_session_id is
  'TriviaSession.id ao qual join_token pertence. Impede um token antigo de expor a sessao seguinte.';

alter table public.games
  add column if not exists source_session_id text;

create unique index if not exists games_owner_source_session_idx
  on public.games (owner_user_id, source_session_id)
  where source_session_id is not null;

comment on column public.games.source_session_id is
  'TriviaSession.id original. Chave idempotente de finalizacao dentro da conta do host.';

-- ---------------------------------------------------------------------------
-- Ledger de claims. Linhas nunca sao apagadas; revogacao preserva ator/data.
-- ---------------------------------------------------------------------------
create table if not exists public.participant_claims (
  id                    uuid        primary key default gen_random_uuid(),
  online_session_id     uuid        references public.online_sessions(id) on delete set null,
  game_id               uuid        references public.games(id) on delete cascade,
  game_participant_id   uuid        references public.game_participants(id) on delete set null,
  participant_client_id text        not null,
  profile_id            uuid        not null references public.profiles(id) on delete cascade,
  source                text        not null check (source in ('live-qr', 'session-qr')),
  status                text        not null default 'active' check (status in ('active', 'revoked')),
  claimed_at            timestamptz not null default now(),
  revoked_at            timestamptz,
  revoked_by            uuid        references public.profiles(id) on delete set null,
  constraint participant_claims_has_scope
    check (online_session_id is not null or game_id is not null),
  constraint participant_claims_revocation_shape
    check (
      (status = 'active' and revoked_at is null and revoked_by is null)
      or (status = 'revoked' and revoked_at is not null)
    )
);

comment on table public.participant_claims is
  'Ledger preservado de reivindicacoes ao vivo/historicas. Mutacoes somente pelas RPCs da migration 0009.';

create unique index if not exists participant_claims_live_slot_active_idx
  on public.participant_claims (online_session_id, participant_client_id)
  where status = 'active' and online_session_id is not null;

create unique index if not exists participant_claims_live_profile_active_idx
  on public.participant_claims (online_session_id, profile_id)
  where status = 'active' and online_session_id is not null;

create unique index if not exists participant_claims_game_slot_active_idx
  on public.participant_claims (game_id, participant_client_id)
  where status = 'active' and game_id is not null;

create unique index if not exists participant_claims_game_profile_active_idx
  on public.participant_claims (game_id, profile_id)
  where status = 'active' and game_id is not null;

create index if not exists participant_claims_profile_idx
  on public.participant_claims (profile_id, claimed_at desc);

alter table public.participant_claims enable row level security;

drop policy if exists "participant_claims_select_scoped" on public.participant_claims;
create policy "participant_claims_select_scoped"
  on public.participant_claims for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.online_sessions os
      where os.id = online_session_id and os.user_id = auth.uid()
    )
    or (game_id is not null and public.is_game_owner(game_id))
  );

revoke all on table public.participant_claims from public, anon, authenticated;
grant select on table public.participant_claims to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_live_invite: somente o host. Rotaciona o token se a linha ativa foi
-- reaproveitada para outra TriviaSession; repetir na mesma sessao e idempotente.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_live_invite(p_session_client_id text)
returns table (online_session_id uuid, join_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_online_session_id uuid;
  v_join_token uuid;
  v_invite_session_id text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if nullif(trim(p_session_client_id), '') is null then
    raise exception 'INVALID_SESSION';
  end if;

  select os.id, os.join_token, os.invite_session_id
  into v_online_session_id, v_join_token, v_invite_session_id
  from public.online_sessions os
  where os.user_id = v_uid
    and os.status = 'active'
    and os.session->>'id' = p_session_client_id
  for update;

  if v_online_session_id is null then
    return;
  end if;

  if v_invite_session_id is distinct from p_session_client_id then
    -- A mesma linha de backup agora representa outra partida. Claims ja
    -- copiados para o historico deixam o escopo ao vivo antes de o token girar.
    update public.participant_claims pc
    set online_session_id = null
    where pc.online_session_id = v_online_session_id
      and pc.game_id is not null;

    v_join_token := gen_random_uuid();
  end if;

  update public.online_sessions os
  set invite_session_id = p_session_client_id,
      join_token = v_join_token
  where os.id = v_online_session_id;

  return query select v_online_session_id, v_join_token;
end;
$$;

revoke execute on function public.get_my_live_invite(text) from public, anon;
grant execute on function public.get_my_live_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- reconcile_my_live_claims: revoga apenas claims de slots removidos do snapshot.
-- Renomear/mover preserva o claim porque participant_client_id e estavel.
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_my_live_claims(p_session_client_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_online_session_id uuid;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select os.id into v_online_session_id
  from public.online_sessions os
  where os.user_id = v_uid
    and os.status = 'active'
    and os.session->>'id' = p_session_client_id
  for update;

  if v_online_session_id is null then
    return 0;
  end if;

  with revoked as (
    update public.participant_claims pc
    set status = 'revoked',
        revoked_at = now(),
        revoked_by = v_uid
    where pc.online_session_id = v_online_session_id
      and pc.status = 'active'
      and not exists (
        select 1
        from public.online_sessions os,
             jsonb_array_elements(coalesce(os.session->'participants', '[]'::jsonb)) participant
        where os.id = v_online_session_id
          and participant->>'id' = pc.participant_client_id
      )
    returning pc.id
  )
  select count(*) into v_count from revoked;

  return v_count;
end;
$$;

revoke execute on function public.reconcile_my_live_claims(text) from public, anon;
grant execute on function public.reconcile_my_live_claims(text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_session_claimable_participants: token unico funciona durante a sessao
-- e, depois da finalizacao, no jogo normalizado. Nunca retorna e-mail.
-- ---------------------------------------------------------------------------
create or replace function public.list_session_claimable_participants(p_join_token uuid)
returns table (
  participant_client_id text,
  display_name text,
  team_name text,
  claimed boolean,
  claimed_by_me boolean,
  claimable boolean,
  claim_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_online_session_id uuid;
  v_session jsonb;
  v_game_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select os.id, os.session
  into v_online_session_id, v_session
  from public.online_sessions os
  where os.join_token = p_join_token
    and os.status = 'active'
    and os.invite_session_id = os.session->>'id';

  if v_online_session_id is not null then
    return query
    select
      participant->>'id',
      coalesce(nullif(participant->>'name', ''), 'Participante'),
      team.team_json->>'name',
      (pc.id is not null or gp.profile_id is not null),
      (pc.profile_id = v_uid or gp.profile_id = v_uid),
      (
        pc.id is null
        and gp.profile_id is null
        and not exists (
          select 1 from public.participant_claims mine
          where mine.online_session_id = v_online_session_id
            and mine.profile_id = v_uid
            and mine.status = 'active'
        )
        and not exists (
          select 1 from public.game_participants game_mine
          where game_mine.game_id = g.id and game_mine.profile_id = v_uid
        )
        and (
          nullif(trim(participant->>'email'), '') is null
          or participant->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          or lower(participant->>'email') = v_email
        )
      ),
      pc.id
    from jsonb_array_elements(coalesce(v_session->'participants', '[]'::jsonb)) participant
    left join lateral (
      select t as team_json
      from jsonb_array_elements(coalesce(v_session->'teams', '[]'::jsonb)) t
      where t->>'id' = participant->>'teamId'
      limit 1
    ) team on true
    left join public.participant_claims pc
      on pc.online_session_id = v_online_session_id
     and pc.participant_client_id = participant->>'id'
     and pc.status = 'active'
    left join public.games g on g.join_token = p_join_token
    left join public.game_participants gp
      on gp.game_id = g.id and gp.client_id = participant->>'id'
    order by coalesce((team.team_json->>'order')::int, 2147483647), participant->>'name';
    return;
  end if;

  select g.id into v_game_id
  from public.games g
  where g.join_token = p_join_token;

  if v_game_id is null then
    return;
  end if;

  return query
  select
    gp.client_id,
    gp.display_name,
    gt.name,
    (gp.profile_id is not null),
    (gp.profile_id = v_uid),
    (
      gp.profile_id is null
      and not exists (
        select 1 from public.game_participants mine
        where mine.game_id = v_game_id and mine.profile_id = v_uid
      )
      and (
        pi.invite_email is null
        or pi.invite_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        or lower(pi.invite_email) = v_email
      )
    ),
    pc.id
  from public.game_participants gp
  left join public.game_teams gt on gt.id = gp.team_id
  left join public.participant_invites pi on pi.participant_id = gp.id
  left join public.participant_claims pc
    on pc.game_id = v_game_id
   and pc.participant_client_id = gp.client_id
   and pc.status = 'active'
  where gp.game_id = v_game_id
  order by gt."order" nulls last, gp.created_at;
end;
$$;

revoke execute on function public.list_session_claimable_participants(uuid) from public, anon;
grant execute on function public.list_session_claimable_participants(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- claim_session_participant: serializa por sessao/jogo, aplica reserva por
-- e-mail quando valida e garante 1 slot por conta. Repetir o proprio claim do
-- mesmo slot retorna sucesso (idempotente).
-- ---------------------------------------------------------------------------
create or replace function public.claim_session_participant(
  p_join_token uuid,
  p_participant_client_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_online_session_id uuid;
  v_session jsonb;
  v_session_client_id text;
  v_participant jsonb;
  v_invite_email text;
  v_game_id uuid;
  v_game_participant_id uuid;
  v_existing_profile uuid;
  v_claim_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if nullif(trim(p_participant_client_id), '') is null then
    raise exception 'INVALID_PARTICIPANT';
  end if;

  select os.id, os.session, os.session->>'id'
  into v_online_session_id, v_session, v_session_client_id
  from public.online_sessions os
  where os.join_token = p_join_token
    and os.status = 'active'
    and os.invite_session_id = os.session->>'id'
  for update;

  if v_online_session_id is not null then
    select participant into v_participant
    from jsonb_array_elements(coalesce(v_session->'participants', '[]'::jsonb)) participant
    where participant->>'id' = p_participant_client_id
    limit 1;

    if v_participant is null then
      raise exception 'INVALID_PARTICIPANT';
    end if;

    select pc.id, pc.profile_id into v_claim_id, v_existing_profile
    from public.participant_claims pc
    where pc.online_session_id = v_online_session_id
      and pc.participant_client_id = p_participant_client_id
      and pc.status = 'active';

    if v_claim_id is not null then
      if v_existing_profile = v_uid then
        return jsonb_build_object(
          'sessionClientId', v_session_client_id,
          'gameId', null,
          'claimId', v_claim_id
        );
      end if;
      raise exception 'SLOT_UNAVAILABLE';
    end if;

    if exists (
      select 1 from public.participant_claims pc
      where pc.online_session_id = v_online_session_id
        and pc.profile_id = v_uid
        and pc.status = 'active'
    ) then
      raise exception 'ALREADY_CLAIMED_IN_SESSION';
    end if;

    v_invite_email := nullif(trim(v_participant->>'email'), '');
    if v_invite_email is not null
       and v_invite_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       and lower(v_invite_email) <> v_email then
      raise exception 'EMAIL_RESERVED';
    end if;

    -- Depois da finalizacao, a linha online continua ativa para restauracao.
    -- Se o token ja foi copiado para games, um claim/correcao posterior precisa
    -- atualizar tambem o historico normalizado na mesma transacao.
    select g.id into v_game_id
    from public.games g
    where g.join_token = p_join_token
    for update;

    if v_game_id is not null then
      if exists (
        select 1 from public.game_participants mine
        where mine.game_id = v_game_id
          and mine.profile_id = v_uid
          and mine.client_id <> p_participant_client_id
      ) then
        raise exception 'ALREADY_CLAIMED_IN_SESSION';
      end if;

      select gp.id, gp.profile_id
      into v_game_participant_id, v_existing_profile
      from public.game_participants gp
      where gp.game_id = v_game_id
        and gp.client_id = p_participant_client_id
      for update;

      if v_game_participant_id is null then
        raise exception 'INVALID_PARTICIPANT';
      end if;

      if v_existing_profile is not null and v_existing_profile <> v_uid then
        raise exception 'SLOT_UNAVAILABLE';
      end if;
    end if;

    insert into public.participant_claims (
      online_session_id, game_id, game_participant_id,
      participant_client_id, profile_id, source
    ) values (
      v_online_session_id, v_game_id, v_game_participant_id,
      p_participant_client_id, v_uid, 'live-qr'
    )
    returning id into v_claim_id;

    if v_game_participant_id is not null then
      update public.game_participants
      set profile_id = v_uid,
          claim_token = null
      where id = v_game_participant_id;
    end if;

    return jsonb_build_object(
      'sessionClientId', v_session_client_id,
      'gameId', null,
      'claimId', v_claim_id
    );
  end if;

  select g.id into v_game_id
  from public.games g
  where g.join_token = p_join_token
  for update;

  if v_game_id is null then
    raise exception 'INVALID_TOKEN';
  end if;

  select gp.id, gp.profile_id, pi.invite_email
  into v_game_participant_id, v_existing_profile, v_invite_email
  from public.game_participants gp
  left join public.participant_invites pi on pi.participant_id = gp.id
  where gp.game_id = v_game_id
    and gp.client_id = p_participant_client_id
  for update of gp;

  if v_game_participant_id is null then
    raise exception 'INVALID_PARTICIPANT';
  end if;

  if v_existing_profile is not null then
    if v_existing_profile = v_uid then
      select pc.id into v_claim_id
      from public.participant_claims pc
      where pc.game_id = v_game_id
        and pc.participant_client_id = p_participant_client_id
        and pc.profile_id = v_uid
        and pc.status = 'active';

      if v_claim_id is null then
        insert into public.participant_claims (
          game_id, game_participant_id, participant_client_id, profile_id, source
        ) values (
          v_game_id, v_game_participant_id, p_participant_client_id, v_uid, 'session-qr'
        )
        returning id into v_claim_id;
      end if;

      return jsonb_build_object('sessionClientId', null, 'gameId', v_game_id, 'claimId', v_claim_id);
    end if;
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  if exists (
    select 1 from public.game_participants gp
    where gp.game_id = v_game_id and gp.profile_id = v_uid
  ) then
    raise exception 'ALREADY_CLAIMED_IN_SESSION';
  end if;

  if v_invite_email is not null
     and v_invite_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     and lower(v_invite_email) <> v_email then
    raise exception 'EMAIL_RESERVED';
  end if;

  update public.game_participants
  set profile_id = v_uid,
      claim_token = null
  where id = v_game_participant_id;

  insert into public.participant_claims (
    game_id, game_participant_id, participant_client_id, profile_id, source
  ) values (
    v_game_id, v_game_participant_id, p_participant_client_id, v_uid, 'session-qr'
  )
  returning id into v_claim_id;

  return jsonb_build_object('sessionClientId', null, 'gameId', v_game_id, 'claimId', v_claim_id);
end;
$$;

revoke execute on function public.claim_session_participant(uuid, text) from public, anon;
grant execute on function public.claim_session_participant(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Leituras do host: dados minimos do claim, sem e-mail/diretorio de contas.
-- ---------------------------------------------------------------------------
create or replace function public.list_my_live_claims(p_session_client_id text)
returns table (
  claim_id uuid,
  participant_client_id text,
  profile_id uuid,
  account_display_name text,
  claimed_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select pc.id, pc.participant_client_id, pc.profile_id, p.display_name, pc.claimed_at
  from public.online_sessions os
  join public.participant_claims pc
    on pc.online_session_id = os.id and pc.status = 'active'
  left join public.profiles p on p.id = pc.profile_id
  where os.user_id = auth.uid()
    and os.status = 'active'
    and os.session->>'id' = p_session_client_id
  order by pc.claimed_at;
$$;

revoke execute on function public.list_my_live_claims(text) from public, anon;
grant execute on function public.list_my_live_claims(text) to authenticated;

create or replace function public.list_my_game_claims(p_game_id uuid)
returns table (
  claim_id uuid,
  participant_client_id text,
  profile_id uuid,
  account_display_name text,
  claimed_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select pc.id, pc.participant_client_id, pc.profile_id, p.display_name, pc.claimed_at
  from public.participant_claims pc
  left join public.profiles p on p.id = pc.profile_id
  where pc.game_id = p_game_id
    and pc.status = 'active'
    and (
      public.is_game_owner(p_game_id)
      or pc.profile_id = auth.uid()
    )
  order by pc.claimed_at;
$$;

revoke execute on function public.list_my_game_claims(uuid) from public, anon;
grant execute on function public.list_my_game_claims(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Correcao do host. Revoga sem apagar a linha e desvincula o participante
-- normalizado somente se ainda apontar para o mesmo perfil.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_participant_claim(p_claim_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_claim public.participant_claims%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select pc.* into v_claim
  from public.participant_claims pc
  where pc.id = p_claim_id and pc.status = 'active'
  for update;

  if v_claim.id is null then
    return false;
  end if;

  if not (
    (v_claim.online_session_id is not null and exists (
      select 1 from public.online_sessions os
      where os.id = v_claim.online_session_id and os.user_id = v_uid
    ))
    or (v_claim.game_id is not null and public.is_game_owner(v_claim.game_id))
  ) then
    raise exception 'NOT_SESSION_OWNER';
  end if;

  update public.participant_claims
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = v_uid
  where id = v_claim.id;

  if v_claim.game_participant_id is not null then
    update public.game_participants
    set profile_id = null
    where id = v_claim.game_participant_id
      and profile_id = v_claim.profile_id;
  end if;

  return true;
end;
$$;

revoke execute on function public.revoke_participant_claim(uuid) from public, anon;
grant execute on function public.revoke_participant_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Finalizacao idempotente e aditiva.
--
-- A funcao antiga continua intacta para importacoes e consumidores existentes.
-- O lock por usuario+session id fecha a corrida "duas abas finalizaram juntas";
-- a unique parcial e a segunda barreira. Se qualquer passo falhar, a transacao
-- inteira (inclusive a criacao interna) e revertida.
-- ---------------------------------------------------------------------------
create or replace function public.create_game_normalized_idempotent(
  p jsonb,
  p_session_client_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_game_id uuid;
  v_online_session_id uuid;
  v_join_token uuid;
begin
  if v_uid is null then
    raise exception 'create_game_normalized_idempotent requer usuario autenticado';
  end if;

  if nullif(trim(p_session_client_id), '') is null then
    raise exception 'INVALID_SESSION';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_uid::text || ':' || p_session_client_id, 0)
  );

  select g.id into v_game_id
  from public.games g
  where g.owner_user_id = v_uid
    and g.source_session_id = p_session_client_id;

  if v_game_id is not null then
    return v_game_id;
  end if;

  select os.id, os.join_token
  into v_online_session_id, v_join_token
  from public.online_sessions os
  where os.user_id = v_uid
    and os.status = 'active'
    and os.session->>'id' = p_session_client_id
  for update;

  if v_online_session_id is not null then
    if exists (
      select 1
      from public.online_sessions os
      where os.id = v_online_session_id
        and os.invite_session_id is distinct from p_session_client_id
    ) then
      update public.participant_claims pc
      set online_session_id = null
      where pc.online_session_id = v_online_session_id
        and pc.game_id is not null;
    end if;

    update public.online_sessions os
    set invite_session_id = p_session_client_id,
        join_token = case
          when os.invite_session_id is distinct from p_session_client_id
            then gen_random_uuid()
          else os.join_token
        end
    where os.id = v_online_session_id
    returning os.join_token into v_join_token;

    -- Claims de slots removidos nao atravessam para o historico.
    update public.participant_claims pc
    set status = 'revoked',
        revoked_at = now(),
        revoked_by = v_uid
    where pc.online_session_id = v_online_session_id
      and pc.status = 'active'
      and not exists (
        select 1
        from public.online_sessions os,
             jsonb_array_elements(coalesce(os.session->'participants', '[]'::jsonb)) participant
        where os.id = v_online_session_id
          and participant->>'id' = pc.participant_client_id
      );
  end if;

  -- Chamada deliberada da RPC 0005, sem alterar sua assinatura/comportamento.
  v_game_id := public.create_game_normalized(p);

  update public.games g
  set source_session_id = p_session_client_id,
      join_token = coalesce(v_join_token, g.join_token)
  where g.id = v_game_id
    and g.owner_user_id = v_uid;

  if v_online_session_id is not null then
    update public.game_participants gp
    set profile_id = pc.profile_id,
        claim_token = null
    from public.participant_claims pc
    where gp.game_id = v_game_id
      and gp.client_id = pc.participant_client_id
      and pc.online_session_id = v_online_session_id
      and pc.status = 'active'
      and gp.profile_id is null;

    update public.participant_claims pc
    set game_id = v_game_id,
        game_participant_id = gp.id
    from public.game_participants gp
    where pc.online_session_id = v_online_session_id
      and pc.status = 'active'
      and gp.game_id = v_game_id
      and gp.client_id = pc.participant_client_id;
  end if;

  return v_game_id;
end;
$$;

revoke execute on function public.create_game_normalized_idempotent(jsonb, text) from public, anon;
grant execute on function public.create_game_normalized_idempotent(jsonb, text) to authenticated;
