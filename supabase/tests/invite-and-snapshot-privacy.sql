insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000001', 'host@example.test', now()),
  ('00000000-0000-0000-0000-000000000002', 'reader@example.test', now()),
  ('00000000-0000-0000-0000-000000000003', 'outsider@example.test', now()),
  ('00000000-0000-0000-0000-000000000004', 'unverified@example.test', null),
  ('00000000-0000-0000-0000-000000000005', 'invited@example.test', now());
update public.profiles
set avatar_path = '00000000-0000-0000-0000-000000000002/70000000-0000-0000-0000-000000000002.webp'
where id = '00000000-0000-0000-0000-000000000002';

insert into public.games (id, owner_user_id, title, source, join_token) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Private game', 'live', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Unverified invite', 'live', '20000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Confirmed invite', 'live', '20000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Outsider game', 'live', '20000000-0000-0000-0000-000000000004');
insert into public.game_participants (id, game_id, client_id, display_name, profile_id, claim_token) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'reader', 'Reader', '00000000-0000-0000-0000-000000000002', null),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'reserved', 'Reserved', null, '40000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'unverified', 'Unverified', null, '40000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'confirmed', 'Confirmed', null, '40000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'legacy-mismatch', 'Legacy mismatch', null, '40000000-0000-0000-0000-000000000005');
insert into public.participant_invites (participant_id, game_id, invite_email) values
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'invited@example.test'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'unverified@example.test'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'invited@example.test'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'outsider@example.test');
insert into public.game_raw_snapshots (game_id, snapshot) values
  ('10000000-0000-0000-0000-000000000001', '{"id":"original","title":"Private game","teams":[],"board":[],"turnSequence":[],"participants":[{"id":"reader","name":"Reader","role":"player","teamId":"a","email":"reader@example.test","invite_email":"hidden@example.test","claim_token":"secret"}]}');
insert into public.online_sessions (id, user_id, session, join_token, invite_session_id) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"id":"live-session","title":"Live","participants":[{"id":"unverified","name":"Unverified","email":"unverified@example.test"},{"id":"confirmed","name":"Confirmed","email":"invited@example.test"},{"id":"open","name":"Open"}],"teams":[],"board":[],"turnSequence":[]}', '60000000-0000-0000-0000-000000000001', 'live-session');
insert into public.online_session_snapshots (user_id, client_session_id, session)
select user_id, session->>'id', session from public.online_sessions;

set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","email":"reader@example.test"}';
select test.assert((select count(*) = 0 from public.game_raw_snapshots), 'participant cannot read raw snapshots');
select test.assert(public.get_game_snapshot('10000000-0000-0000-0000-000000000001')->'participants' = '[{"id":"reader","name":"Reader","role":"player","teamId":"a"}]', 'participant receives only public participant fields');
select test.assert((select count(*) = 0 from public.participant_invites), 'participant cannot read private invitations');
select test.assert((select count(*) = 0 from public.online_sessions), 'participant cannot read live host snapshot');
select test.assert((select count(*) = 0 from public.online_session_snapshots), 'participant cannot read versioned host snapshots');
select test.assert((select avatar_path = '00000000-0000-0000-0000-000000000002/70000000-0000-0000-0000-000000000002.webp' from public.list_game_participant_identities('10000000-0000-0000-0000-000000000001') where participant_client_id = 'reader'), 'avatar identity remains available through its separate authorized RPC');
select test.assert((select bool_and(not (to_jsonb(p) ?| array['email','invite_email','session'])) from public.list_session_claimable_participants('60000000-0000-0000-0000-000000000001') p), 'live invitation list exposes no contacts or raw session');
select test.assert((select count(*) = 0 from public.list_live_participant_identities('live-session')), 'non-host cannot enumerate live account identities');
select test.assert((select count(*) = 0 from public.get_my_live_invite('live-session')), 'non-host cannot retrieve host invite management row');
select test.assert(not has_function_privilege('anon', 'public.get_game_snapshot(uuid)', 'execute'), 'anonymous cannot call snapshot RPC');
select test.assert(not has_schema_privilege('authenticated', 'private', 'usage'), 'internal email lookup is not exposed');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"host@example.test"}';
select test.assert((select count(*) = 1 from public.game_raw_snapshots), 'host retains raw snapshot');
select test.assert(public.get_game_snapshot('10000000-0000-0000-0000-000000000001')->'participants'->0->>'email' = 'reader@example.test', 'host retains contacts for restore');
select test.assert((select session->'participants'->0->>'email' = 'unverified@example.test' from public.online_sessions), 'host live contacts remain intact');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","email":"outsider@example.test"}';
select test.assert(public.get_game_snapshot('10000000-0000-0000-0000-000000000001') is null, 'outsider cannot obtain snapshot');
select test.expect_error($query$insert into public.participant_invites (participant_id, game_id, invite_email) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'outsider@example.test')$query$, 'participant_invites_game_participant_fk');
select test.expect_error($query$select public.claim_participant_by_game('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002')$query$, 'EMAIL_RESERVED');
select test.expect_error($query$select public.claim_participant('40000000-0000-0000-0000-000000000002')$query$, 'EMAIL_RESERVED');
select test.assert(public.link_my_participations() = 0, 'outsider cannot auto-link other invitations');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","email":"unverified@example.test"}';
select test.assert(public.link_my_participations() = 0, 'unverified email cannot auto-link');
select test.expect_error($query$select public.claim_participant_by_game('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003')$query$, 'EMAIL_RESERVED');
select test.expect_error($query$select public.claim_participant('40000000-0000-0000-0000-000000000003')$query$, 'EMAIL_RESERVED');
select test.expect_error($query$select public.claim_session_participant('60000000-0000-0000-0000-000000000001','unverified')$query$, 'EMAIL_RESERVED');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","email":"invited@example.test"}';
select test.assert(public.link_my_participations() = 0, 'auto-link ignores forged email claim and uses Auth row');
select test.expect_error($query$select public.claim_participant_by_game('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002')$query$, 'EMAIL_RESERVED');
select test.expect_error($query$select public.claim_session_participant('60000000-0000-0000-0000-000000000001','confirmed')$query$, 'EMAIL_RESERVED');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","email":"invited@example.test"}';
select test.assert(public.claim_participant_by_game('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002') = '10000000-0000-0000-0000-000000000001', 'confirmed invitee can use historical link');
select test.assert(public.link_my_participations() = 1, 'confirmed invitee auto-links only remaining invitation');
select test.assert(public.claim_session_participant('60000000-0000-0000-0000-000000000001','confirmed')->>'claimId' is not null, 'confirmed live claim succeeds');
select test.assert(public.claim_session_participant('60000000-0000-0000-0000-000000000001','confirmed')->>'claimId' is not null, 'confirmed live claim remains idempotent');
select test.assert((select count(*) = 0 from public.online_sessions), 'claim owner still cannot read live host contacts');
select test.assert((select count(*) = 0 from public.online_session_snapshots), 'claim owner still cannot read versioned host contacts');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","email":"outsider@example.test"}';
select test.assert(public.claim_session_participant('60000000-0000-0000-0000-000000000001','open')->>'claimId' is not null, 'unreserved live slot remains available');
select test.expect_error($query$select public.claim_participant('40000000-0000-0000-0000-000000000003')$query$, 'EMAIL_RESERVED');

reset role;
update auth.users set email = 'invited-changed@example.test'
where id = '00000000-0000-0000-0000-000000000005';
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","email":"invited-changed@example.test"}';
select test.expect_error($query$select public.claim_participant('40000000-0000-0000-0000-000000000003')$query$, 'EMAIL_RESERVED');
select test.assert(public.claim_session_participant('60000000-0000-0000-0000-000000000001','confirmed')->>'claimId' is not null, 'existing live claim survives subsequent Auth email change');

set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"host@example.test"}';
select test.assert(public.create_game_normalized_idempotent('{"game":{"title":"Live","status":"finished","source":"live"},"snapshot":{"id":"live-session","title":"Live","participants":[],"teams":[],"board":[],"turnSequence":[]},"teams":[],"participants":[{"client_id":"confirmed","display_name":"Confirmed","role":"player","invite_email":"invited@example.test"},{"client_id":"open","display_name":"Open","role":"player"}],"films":[],"questions":[],"events":[]}', 'live-session') is not null, 'finalization transfers authorized claims without breaking host flow');
reset role;
select test.assert((select count(*) = 2 from public.game_participants where game_id = (select id from public.games where source_session_id = 'live-session') and profile_id is not null), 'finalized game retains both valid live claim owners');
select test.assert((select count(*) = 1 from public.participant_invites where participant_id = '30000000-0000-0000-0000-000000000005'), 'migration preserves inconsistent legacy row for operator review');
select test.assert((select profile_id is null from public.game_participants where id = '30000000-0000-0000-0000-000000000005'), 'legacy inconsistent invitation never authorizes foreign game');

insert into public.games (id, owner_user_id, title, source, source_session_id, join_token) values
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Different session', 'live', 'other-live-session', '20000000-0000-0000-0000-000000000005');
insert into public.game_participants (id, game_id, client_id, display_name) values
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', 'confirmed', 'Other session'),
  ('30000000-0000-0000-0000-000000000007', (select id from public.games where source_session_id = 'live-session'), 'other-client', 'Other client');
insert into public.participant_invites (participant_id, game_id, invite_email)
select id, game_id, 'invited@example.test' from public.game_participants
where id in ('30000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000007');

set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"host@example.test"}';
-- Um ledger ativo de outra sessao ou outro client nao dispensa a reserva.
select test.expect_error($query$update public.game_participants set profile_id = '00000000-0000-0000-0000-000000000005' where id = '30000000-0000-0000-0000-000000000006'$query$, 'EMAIL_RESERVED');
select test.expect_error($query$update public.game_participants set profile_id = '00000000-0000-0000-0000-000000000005' where id = '30000000-0000-0000-0000-000000000007'$query$, 'EMAIL_RESERVED');
reset role;
select 'Database privacy/authorization checks passed' as result;
