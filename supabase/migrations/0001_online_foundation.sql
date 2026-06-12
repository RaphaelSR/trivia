-- =============================================================================
-- Migration 0001: online_foundation
-- Cria as tabelas base para o modo online: profiles e game_history.
-- Todas as tabelas têm RLS habilitado — nenhum acesso anônimo é permitido.
-- Execute este arquivo no SQL Editor do painel do Supabase:
--   Dashboard → SQL Editor → New query → cole o conteúdo → Run
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Tabela: profiles
-- Extensão de auth.users: criada automaticamente via trigger ao cadastrar.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now() not null
);

comment on table public.profiles is
  'Perfil público do usuário. Criado automaticamente via trigger handle_new_user.';

-- Habilita Row Level Security — obrigatório; sem isso qualquer anon pode ler.
alter table public.profiles enable row level security;

-- Policy: o usuário só vê e edita o próprio perfil
-- "using" controla SELECT/UPDATE/DELETE; "with check" controla INSERT/UPDATE.

-- SELECT: só o próprio dono lê seu perfil
create policy "profiles_select_own"
  on public.profiles
  for select
  -- auth.uid() é a função do Supabase que retorna o UUID do usuário autenticado.
  -- Quando não há sessão, retorna null → condição falsa → nenhuma linha retornada.
  using (auth.uid() = id);

-- INSERT: só o próprio usuário pode inserir (o trigger usa security definer, então
-- ele possui permissão elevada; esta policy cobre inserções diretas via client).
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- UPDATE: só o dono atualiza o próprio perfil
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- DELETE: só o dono pode deletar o próprio perfil
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- Função e trigger: handle_new_user
-- Cria automaticamente um profile quando um usuário se cadastra no Supabase Auth.
-- security definer: roda com permissão do criador da função (superuser), não do
-- usuário que dispara o insert em auth.users.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- search_path vazio previne ataques de substituição de schema
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger: executa após cada insert na tabela de usuários do Supabase Auth
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Tabela: game_history
-- Registro das partidas finalizadas, vinculadas ao usuário dono.
-- summary (jsonb) armazena pontuações finais, times e vencedor de forma flexível.
-- ---------------------------------------------------------------------------
create table if not exists public.game_history (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  finished_at timestamptz not null default now(),
  -- summary: estrutura livre — ex: { teams: [...], winner: "...", scores: {...} }
  summary     jsonb       not null,
  created_at  timestamptz not null default now()
);

comment on table public.game_history is
  'Histórico de partidas finalizadas. Cada linha pertence ao usuário que a registrou.';
comment on column public.game_history.summary is
  'Snapshot JSON do resultado: times, pontuações e vencedor. Estrutura livre para evolução.';

-- Índice para listagem eficiente do histórico do usuário (ordem cronológica inversa)
create index if not exists game_history_user_finished_idx
  on public.game_history (user_id, finished_at desc);

-- Habilita Row Level Security
alter table public.game_history enable row level security;

-- Policy: o usuário só vê seu próprio histórico
create policy "game_history_select_own"
  on public.game_history
  for select
  using (auth.uid() = user_id);

-- Policy: o usuário só insere no próprio histórico
-- with check garante que user_id no payload = uid da sessão
create policy "game_history_insert_own"
  on public.game_history
  for insert
  with check (auth.uid() = user_id);

-- Policy: o usuário pode atualizar apenas seus próprios registros
-- (raro — mas necessário para eventual edição de título etc.)
create policy "game_history_update_own"
  on public.game_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: o usuário pode deletar apenas seus próprios registros
create policy "game_history_delete_own"
  on public.game_history
  for delete
  using (auth.uid() = user_id);
