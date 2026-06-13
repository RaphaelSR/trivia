-- =============================================================================
-- Migration 0002: online_sessions
-- Snapshot JSONB da sessão de jogo do host logado, para restauração cross-device.
-- Espelho na nuvem do que o modo offline faz com localStorage.
-- RLS owner-only. Idempotente. Execute no SQL Editor do painel do Supabase.
-- =============================================================================

create table if not exists public.online_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  -- status: 'active' = sessão em andamento (no máx. 1 ativa por usuário);
  --         'archived' = finalizada/histórico.
  status       text        not null default 'active'
                           check (status in ('active', 'archived')),
  title        text        not null default 'Sessao online',
  mode         text        not null default 'online',
  -- session: TriviaSession completo serializado (board, teams, mimicaScores, etc.)
  -- O TriviaSession.id do client fica DENTRO do JSONB; o id desta linha é
  -- identificador de armazenamento, não de jogo.
  session      jsonb       not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.online_sessions is
  'Snapshot JSONB da sessao de trivia do host. Cada linha pertence ao usuario dono. Fonte canonica para backfill normalizado na fase 3.';
comment on column public.online_sessions.session is
  'Objeto TriviaSession completo serializado. Estrutura espelha o localStorage do modo offline.';

-- Garante no máximo 1 sessão ATIVA por usuário (a sessão cross-device).
-- Index parcial único — sessões archived não entram na restrição.
create unique index if not exists online_sessions_one_active_per_user_idx
  on public.online_sessions (user_id)
  where status = 'active';

-- Listagem do histórico do usuário (ordem cronológica inversa).
create index if not exists online_sessions_user_updated_idx
  on public.online_sessions (user_id, updated_at desc);

-- updated_at automático em cada UPDATE (base do last-write-wins).
create or replace function public.touch_online_sessions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists online_sessions_set_updated_at on public.online_sessions;
create trigger online_sessions_set_updated_at
  before update on public.online_sessions
  for each row
  execute procedure public.touch_online_sessions_updated_at();

-- Habilita Row Level Security — obrigatório em toda tabela deste projeto.
alter table public.online_sessions enable row level security;

-- Policies owner-only: o usuário só acessa as próprias sessões.
drop policy if exists "online_sessions_select_own" on public.online_sessions;
create policy "online_sessions_select_own"
  on public.online_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "online_sessions_insert_own" on public.online_sessions;
create policy "online_sessions_insert_own"
  on public.online_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "online_sessions_update_own" on public.online_sessions;
create policy "online_sessions_update_own"
  on public.online_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "online_sessions_delete_own" on public.online_sessions;
create policy "online_sessions_delete_own"
  on public.online_sessions for delete
  using (auth.uid() = user_id);
