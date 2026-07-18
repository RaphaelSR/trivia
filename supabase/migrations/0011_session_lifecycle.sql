-- =============================================================================
-- Migration 0011: session_lifecycle
-- Troca atomica da partida ativa sem reutilizar a identidade da anterior.
--
-- A sessao continua local-first. Esta RPC somente transforma o snapshot local
-- escolhido pelo host na sessao ativa da conta. Uma partida ativa diferente e
-- arquivada na mesma transacao, preservando seu snapshot para retomada.
-- =============================================================================

alter table public.online_sessions
  add column if not exists session_client_id text;

update public.online_sessions
set session_client_id = nullif(session ->> 'id', '')
where session_client_id is null;

comment on column public.online_sessions.session_client_id is
  'TriviaSession.id do snapshot. Identidade da partida, separada do UUID da linha de armazenamento.';

create index if not exists online_sessions_user_client_session_idx
  on public.online_sessions (user_id, session_client_id, updated_at desc);

create or replace function public.sync_online_session_client_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.session_client_id := nullif(new.session ->> 'id', '');
  return new;
end;
$$;

drop trigger if exists online_sessions_sync_client_id on public.online_sessions;
create trigger online_sessions_sync_client_id
  before insert or update of session on public.online_sessions
  for each row
  execute procedure public.sync_online_session_client_id();

create or replace function public.save_online_session_snapshot(
  p_session jsonb,
  p_title text,
  p_mode text default 'cloud'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_session_id text := nullif(p_session ->> 'id', '');
  v_target_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if v_client_session_id is null then
    raise exception 'INVALID_SESSION_ID';
  end if;

  -- Serializa trocas da mesma conta. Duas abas concorrentes nao conseguem
  -- deixar duas linhas ativas nem arquivar a escolha uma da outra no meio.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select os.id
    into v_target_id
  from public.online_sessions os
  where os.user_id = v_user_id
    and os.session_client_id = v_client_session_id
  order by (os.status = 'active') desc, os.updated_at desc
  limit 1
  for update;

  -- Preserva qualquer outra partida como arquivada antes de ativar a escolhida.
  update public.online_sessions os
  set status = 'archived'
  where os.user_id = v_user_id
    and os.status = 'active'
    and (v_target_id is null or os.id <> v_target_id);

  if v_target_id is null then
    insert into public.online_sessions (
      user_id,
      status,
      title,
      mode,
      session,
      session_client_id
    ) values (
      v_user_id,
      'active',
      coalesce(nullif(trim(p_title), ''), 'Trivia'),
      coalesce(nullif(trim(p_mode), ''), 'cloud'),
      p_session,
      v_client_session_id
    )
    returning id into v_target_id;
  else
    update public.online_sessions os
    set status = 'active',
        title = coalesce(nullif(trim(p_title), ''), os.title),
        mode = coalesce(nullif(trim(p_mode), ''), os.mode),
        session = p_session,
        session_client_id = v_client_session_id
    where os.id = v_target_id
      and os.user_id = v_user_id;
  end if;

  return v_target_id;
end;
$$;

revoke all on function public.save_online_session_snapshot(jsonb, text, text)
  from public, anon;
grant execute on function public.save_online_session_snapshot(jsonb, text, text)
  to authenticated;

comment on function public.save_online_session_snapshot(jsonb, text, text) is
  'Salva/ativa um snapshot por TriviaSession.id e arquiva atomicamente a partida ativa anterior da conta.';
