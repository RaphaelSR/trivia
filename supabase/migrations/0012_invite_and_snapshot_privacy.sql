-- Projecao sem contatos por RPC, inclusive para partidas anteriores a esta migration.
-- Rollout: aplicar 0012, publicar o frontend com a RPC e so entao aplicar 0013.
-- Esta etapa aditiva mantem a leitura antiga durante a troca do frontend.
-- A confirmacao de e-mail no Supabase Auth deve estar ligada antes do rollout:
-- email_confirmed_at tambem e preenchido pelo Auth quando auto-confirm esta ligado.

create or replace function public.get_game_snapshot(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
  v_participants jsonb;
begin
  if auth.uid() is null or not public.is_game_reader(p_game_id) then
    return null;
  end if;

  select snapshot into v_snapshot
  from public.game_raw_snapshots where game_id = p_game_id;
  if v_snapshot is null or public.is_game_owner(p_game_id) then
    return v_snapshot;
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', participant->'id', 'name', participant->'name',
    'role', participant->'role', 'teamId', participant->'teamId'
  )) order by position), '[]'::jsonb)
  into v_participants
  from jsonb_array_elements(case
    when jsonb_typeof(v_snapshot->'participants') = 'array'
      then v_snapshot->'participants' else '[]'::jsonb end
  ) with ordinality as participants(participant, position);

  return jsonb_set(v_snapshot, '{participants}', v_participants);
end;
$$;

revoke execute on function public.get_game_snapshot(uuid) from public, anon;
grant execute on function public.get_game_snapshot(uuid) to authenticated;

-- NOT VALID preserva inconsistencias legadas para revisao do operador, mas
-- impede imediatamente novos convites que apontem para outro jogo.
create unique index if not exists game_participants_game_id_id_idx
  on public.game_participants (game_id, id);
do $$
begin
  if not exists (select 1 from pg_constraint
    where conname = 'participant_invites_game_participant_fk'
      and conrelid = 'public.participant_invites'::regclass) then
    alter table public.participant_invites
      add constraint participant_invites_game_participant_fk
      foreign key (game_id, participant_id)
      references public.game_participants (game_id, id) on delete cascade not valid;
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.confirmed_email(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = p_user and u.email_confirmed_at is not null;
$$;
revoke all on function private.confirmed_email(uuid) from public, anon, authenticated;

-- Uma guarda na tabela protege todos os caminhos, inclusive RPCs legadas e a
-- copia dos claims ao finalizar; o cliente nao pode escolher a identidade Auth.
create or replace function private.guard_reserved_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.profile_id is null then return new; end if;
  if tg_op = 'UPDATE' then
    if new.profile_id is not distinct from old.profile_id
      and new.game_id is not distinct from old.game_id then return new; end if;
  end if;

  -- Finalizar transfere uma autorizacao ja registrada, mesmo se a pessoa
  -- trocou o e-mail depois do claim. Outro jogo/client/host nao herda essa prova.
  if exists (
    select 1
    from public.participant_claims pc
    join public.online_sessions os on os.id = pc.online_session_id
    join public.games g on g.id = new.game_id
    where pc.status = 'active' and pc.profile_id = new.profile_id
      and pc.participant_client_id = new.client_id
      and g.owner_user_id = auth.uid() and os.user_id = g.owner_user_id
      and os.status = 'active' and os.join_token = g.join_token
      and g.source_session_id = os.session->>'id'
      and os.invite_session_id = g.source_session_id
      and (pc.game_id is null or pc.game_id = g.id)
      and (pc.game_participant_id is null or pc.game_participant_id = new.id)
  ) then return new; end if;

  select trim(invite_email) into v_email
  from public.participant_invites
  where participant_id = new.id and game_id = new.game_id;
  if v_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and lower(v_email) is distinct from private.confirmed_email(new.profile_id) then
    raise exception 'EMAIL_RESERVED';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reserved_participant() from public, anon, authenticated;

drop trigger if exists participant_reserved_email on public.game_participants;
create trigger participant_reserved_email
  before insert or update of profile_id, game_id on public.game_participants
  for each row execute function private.guard_reserved_participant();

create or replace function private.guard_reserved_live_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' then
    if new.profile_id is not distinct from old.profile_id
      and new.online_session_id is not distinct from old.online_session_id
      and new.participant_client_id is not distinct from old.participant_client_id
      and old.status = 'active' then return new; end if;
  end if;

  select trim(participant->>'email') into v_email
  from public.online_sessions os,
    jsonb_array_elements(os.session->'participants') participant
  where os.id = new.online_session_id
    and participant->>'id' = new.participant_client_id;
  if v_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and lower(v_email) is distinct from private.confirmed_email(new.profile_id) then
    raise exception 'EMAIL_RESERVED';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reserved_live_claim() from public, anon, authenticated;

drop trigger if exists live_claim_reserved_email on public.participant_claims;
create trigger live_claim_reserved_email
  before insert or update on public.participant_claims
  for each row execute function private.guard_reserved_live_claim();

create or replace function public.link_my_participations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := private.confirmed_email(v_uid);
  v_count integer;
begin
  if v_uid is null or v_email is null then return 0; end if;

  with linked as (
    update public.game_participants gp
    set profile_id = v_uid
    from public.participant_invites pi
    where pi.participant_id = gp.id
      and pi.game_id = gp.game_id
      and lower(trim(pi.invite_email)) = v_email
      and gp.profile_id is null
    returning gp.id
  ) select count(*) into v_count from linked;

  return coalesce(v_count, 0);
end;
$$;
revoke execute on function public.link_my_participations() from public, anon;
grant execute on function public.link_my_participations() to authenticated;
