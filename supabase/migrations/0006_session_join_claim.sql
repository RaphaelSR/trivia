-- =============================================================================
-- Migration 0006: session_join_claim
-- Convite GENÉRICO da sessão: um único token/QR por jogo (join_token). A pessoa
-- abre, loga e escolhe qual participante é. Convive com o claim por participante
-- (0005), que continua sendo o caminho preciso.
--
-- Regras (escolha do produto):
--   - 1 slot por conta por jogo (uma conta não reivindica dois participantes).
--   - Sem re-troca (um slot já vinculado não pode ser tomado).
--
-- Idempotente. Execute no SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- games.join_token — capability do convite genérico da sessão.
-- Cada jogo (inclusive os já existentes) recebe um uuid único.
-- ---------------------------------------------------------------------------
alter table public.games
  add column if not exists join_token uuid not null default gen_random_uuid();

create unique index if not exists games_join_token_idx on public.games (join_token);

-- ---------------------------------------------------------------------------
-- list_claimable_participants(game_token) — lista os participantes do jogo
-- para a tela de escolha. Retorna apelidos (PII mínima) + flag de já vinculado.
-- SECURITY DEFINER: o token é a prova; exige usuário autenticado (grant abaixo).
-- ---------------------------------------------------------------------------
create or replace function public.list_claimable_participants(p_game_token uuid)
returns table (
  participant_id uuid,
  display_name   text,
  team_name      text,
  claimed        boolean
)
language sql
security definer
set search_path = ''
as $$
  select gp.id,
         gp.display_name,
         gt.name,
         (gp.profile_id is not null) as claimed
  from public.games g
  join public.game_participants gp on gp.game_id = g.id
  left join public.game_teams gt on gt.id = gp.team_id
  where g.join_token = p_game_token
  order by gt."order" nulls last, gp.created_at;
$$;

revoke execute on function public.list_claimable_participants(uuid) from public, anon;
grant execute on function public.list_claimable_participants(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- claim_participant_by_game(game_token, participant_id) — vincula o participante
-- escolhido ao usuário atual, aplicando as travas:
--   * 1 slot por conta por jogo;
--   * só vincula slot livre que pertence ao jogo do token.
-- Retorna o game_id, ou levanta exceção com mensagem tratável.
-- ---------------------------------------------------------------------------
create or replace function public.claim_participant_by_game(
  p_game_token     uuid,
  p_participant_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := auth.uid();
  v_game         uuid;
  v_claimed_game uuid;
begin
  if v_uid is null then
    raise exception 'claim_participant_by_game requer usuário autenticado';
  end if;

  select id into v_game from public.games where join_token = p_game_token;
  if v_game is null then
    raise exception 'INVALID_TOKEN';
  end if;

  -- Trava: 1 slot por conta por jogo.
  if exists (
    select 1 from public.game_participants
    where game_id = v_game and profile_id = v_uid
  ) then
    raise exception 'ALREADY_CLAIMED_IN_GAME';
  end if;

  -- Trava: sem re-troca — só vincula se o slot está livre e pertence ao jogo.
  update public.game_participants
  set profile_id = v_uid,
      claim_token = null
  where id = p_participant_id
    and game_id = v_game
    and profile_id is null
  returning game_id into v_claimed_game;

  if v_claimed_game is null then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  return v_claimed_game;
end;
$$;

revoke execute on function public.claim_participant_by_game(uuid, uuid) from public, anon;
grant execute on function public.claim_participant_by_game(uuid, uuid) to authenticated;
