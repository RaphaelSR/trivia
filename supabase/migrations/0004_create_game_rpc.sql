-- =============================================================================
-- Migration 0004: create_game_normalized (RPC)
-- Insere uma partida completa no modelo normalizado em UMA transação:
-- games → snapshot → teams → participants → films → questions → eventos +
-- distribuições → winner. O cliente Supabase não tem transação multi-statement;
-- esta função garante atomicidade (qualquer erro desfaz tudo).
--
-- SECURITY INVOKER: roda como o usuário chamador — todas as RLS owner-only
-- da migration 0003 continuam valendo (owner = auth.uid()).
-- Idempotente (create or replace). Execute no SQL Editor.
-- =============================================================================

create or replace function public.create_game_normalized(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game_id  uuid;
  v_tmap     jsonb := '{}'::jsonb;  -- client_id do time -> uuid
  v_pmap     jsonb := '{}'::jsonb;  -- client_id do participante -> uuid
  v_fmap     jsonb := '{}'::jsonb;  -- client_id do filme -> uuid
  v_qmap     jsonb := '{}'::jsonb;  -- client_id da pergunta -> uuid
  rec        jsonb;
  r2         jsonb;
  v_id       uuid;
  v_event_id uuid;
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
      -- Segurança: só permite auto-vinculação. Vincular OUTRAS contas é
      -- exclusivo do claim flow (token), nunca por payload.
      case when rec->>'profile_id' = auth.uid()::text then auth.uid() else null end
    )
    returning id into v_id;
    v_pmap := v_pmap || jsonb_build_object(rec->>'client_id', v_id);
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

-- Apenas usuários autenticados executam; anon não.
revoke execute on function public.create_game_normalized(jsonb) from public, anon;
grant execute on function public.create_game_normalized(jsonb) to authenticated;
