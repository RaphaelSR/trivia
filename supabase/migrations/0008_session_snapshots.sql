-- =============================================================================
-- Migration 0008: online_session_snapshots (histórico de versões / T4)
-- Guarda os últimos N snapshots JSONB de cada partida online, para o usuário
-- poder VOLTAR a um estado anterior (recuperação por versão). Complementa o
-- eventLog (auditoria do que aconteceu) com a capacidade de restaurar.
-- RLS owner-only. Idempotente. Rode no SQL Editor do painel do Supabase.
-- =============================================================================

create table if not exists public.online_session_snapshots (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  -- Id do TriviaSession do client (estável entre dispositivos). Agrupa as
  -- versões da MESMA partida; o prune mantém só as N mais recentes por grupo.
  client_session_id text        not null,
  title             text        not null default 'Sessao online',
  -- Snapshot completo do TriviaSession naquele momento.
  session           jsonb       not null,
  created_at        timestamptz not null default now()
);

comment on table public.online_session_snapshots is
  'Histórico append-only de snapshots de partidas online (últimos N por partida). Fonte de restauração por versão (T4).';
comment on column public.online_session_snapshots.client_session_id is
  'TriviaSession.id do client — agrupa as versões da mesma partida (estável entre dispositivos).';

-- Listagem/prune por partida, em ordem cronológica inversa.
create index if not exists online_session_snapshots_user_session_idx
  on public.online_session_snapshots (user_id, client_session_id, created_at desc);

-- ── RLS owner-only ───────────────────────────────────────────────────────────
alter table public.online_session_snapshots enable row level security;

drop policy if exists "session_snapshots_select_own" on public.online_session_snapshots;
create policy "session_snapshots_select_own"
  on public.online_session_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "session_snapshots_insert_own" on public.online_session_snapshots;
create policy "session_snapshots_insert_own"
  on public.online_session_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "session_snapshots_delete_own" on public.online_session_snapshots;
create policy "session_snapshots_delete_own"
  on public.online_session_snapshots for delete
  using (auth.uid() = user_id);

-- ── RPC: grava um snapshot e poda os antigos (mantém só os N mais recentes) ───
-- SECURITY INVOKER: roda como o usuário; o user_id é sempre auth.uid() (nunca
-- confiado do client). A poda só apaga linhas do próprio usuário (RLS + filtro).
create or replace function public.save_session_snapshot(
  p_client_session_id text,
  p_title             text,
  p_session           jsonb,
  p_keep              int default 15
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Limite de segurança para o prune (evita keep absurdo/negativo).
  if p_keep is null or p_keep < 1 then
    p_keep := 1;
  elsif p_keep > 100 then
    p_keep := 100;
  end if;

  insert into public.online_session_snapshots (user_id, client_session_id, title, session)
  values (v_user, p_client_session_id, p_title, p_session)
  returning id into v_id;

  -- Mantém apenas os p_keep snapshots mais recentes desta partida.
  delete from public.online_session_snapshots s
  where s.user_id = v_user
    and s.client_session_id = p_client_session_id
    and s.id not in (
      select id
      from public.online_session_snapshots
      where user_id = v_user
        and client_session_id = p_client_session_id
      order by created_at desc
      limit p_keep
    );

  return v_id;
end;
$$;
