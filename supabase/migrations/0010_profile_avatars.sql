-- =============================================================================
-- Migration 0010: profile_avatars
-- Avatar publico de perfil, upload owner-only e leituras de identidade
-- estritamente limitadas a uma sessao/jogo compartilhado.
--
-- Compatibilidade:
--   * avatar nao entra em TriviaSession, snapshots, turnos ou pontuacao;
--   * nenhuma RPC anterior e substituida;
--   * arquivos usam caminho opaco uid/uuid.webp, sem nome, e-mail ou filename;
--   * o bucket e publico somente para leitura da imagem. Upload/update/delete
--     continuam protegidos por RLS na pasta do proprio auth.uid().
-- =============================================================================

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

comment on column public.profiles.avatar_path is
  'Caminho opaco no bucket profile-avatars. Nunca contem nome, e-mail ou filename original.';
comment on column public.profiles.avatar_updated_at is
  'Versao usada para invalidar cache da URL publica do avatar.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_path_shape'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_path_shape
      check (
        avatar_path is null
        or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
      );
  end if;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'profile-avatars',
  'profile-avatars',
  true,
  1048576,
  array['image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_avatars_select_own_metadata" on storage.objects;
create policy "profile_avatars_select_own_metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "profile_avatars_insert_own_folder" on storage.objects;
create policy "profile_avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "profile_avatars_update_own_folder" on storage.objects;
create policy "profile_avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "profile_avatars_delete_own_folder" on storage.objects;
create policy "profile_avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid()::text)
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Identidade do proprio usuario. Nao cria diretorio publico.
create or replace function public.get_my_profile_identity()
returns table (
  profile_id uuid,
  display_name text,
  avatar_path text,
  avatar_updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_path, p.avatar_updated_at
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_profile_identity() from public, anon;
grant execute on function public.get_my_profile_identity() to authenticated;

-- Host ve somente identidades que ja reivindicaram um slot na sua sessao.
create or replace function public.list_live_participant_identities(
  p_session_client_id text
)
returns table (
  participant_client_id text,
  profile_id uuid,
  account_display_name text,
  avatar_path text,
  avatar_updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    pc.participant_client_id,
    p.id,
    p.display_name,
    p.avatar_path,
    p.avatar_updated_at
  from public.online_sessions os
  join public.participant_claims pc
    on pc.online_session_id = os.id
   and pc.status = 'active'
  join public.profiles p on p.id = pc.profile_id
  where os.user_id = auth.uid()
    and os.status = 'active'
    and os.session->>'id' = p_session_client_id
  order by pc.claimed_at;
$$;

revoke execute on function public.list_live_participant_identities(text) from public, anon;
grant execute on function public.list_live_participant_identities(text) to authenticated;

-- Dono e participantes vinculados podem ver apenas as identidades daquele jogo.
create or replace function public.list_game_participant_identities(
  p_game_id uuid
)
returns table (
  participant_client_id text,
  profile_id uuid,
  account_display_name text,
  avatar_path text,
  avatar_updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    gp.client_id,
    p.id,
    p.display_name,
    p.avatar_path,
    p.avatar_updated_at
  from public.games g
  join public.game_participants gp
    on gp.game_id = g.id
   and gp.profile_id is not null
  join public.profiles p on p.id = gp.profile_id
  where g.id = p_game_id
    and (
      g.owner_user_id = auth.uid()
      or exists (
        select 1
        from public.game_participants mine
        where mine.game_id = g.id
          and mine.profile_id = auth.uid()
      )
    )
  order by gp.created_at;
$$;

revoke execute on function public.list_game_participant_identities(uuid) from public, anon;
grant execute on function public.list_game_participant_identities(uuid) to authenticated;
