-- =============================================================================
-- Migration 0007: owner_invite_contacts
-- RPC list_my_invite_contacts — autocomplete de e-mails do PRÓPRIO host.
--
-- GARANTIA DE PRIVACIDADE:
--   • SECURITY INVOKER: a função executa com os privilégios do CALLER (não do owner
--     do banco). Combinado com a RLS "participant_invites_owner_all" (migration 0005),
--     que restringe SELECT a is_game_owner(game_id), somente o dono do jogo consegue
--     ler suas próprias linhas — nunca as de outros hosts.
--   • Sem consulta a auth.users, profiles ou qualquer flag "tem conta".
--     Retorna apenas e-mails que o próprio host já digitou antes.
--   • Não é um diretório global: usuário A nunca vê e-mails de convites de usuário B.
-- =============================================================================

create or replace function public.list_my_invite_contacts()
returns table (invite_email text, last_display_name text)
language sql
security invoker
set search_path = ''
as $$
  -- distinct on: para cada e-mail normalizado, retorna apenas o registro mais recente
  -- (order by created_at desc). A RLS owner-only de participant_invites garante que
  -- apenas os convites do CALLER (= host logado) são visíveis neste SELECT.
  select distinct on (lower(pi.invite_email))
         lower(pi.invite_email) as invite_email,
         gp.display_name        as last_display_name
  from public.participant_invites pi
  join public.game_participants gp on gp.id = pi.participant_id
  order by lower(pi.invite_email), pi.created_at desc;
$$;

-- Revogar de roles mais amplas para garantir que apenas usuários autenticados
-- (logados) possam chamar a função — anon e public ficam sem acesso.
revoke execute on function public.list_my_invite_contacts() from public, anon;
grant execute on function public.list_my_invite_contacts() to authenticated;
