import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/0009_live_session_claims.sql'),
  'utf8',
)

describe('migration 0009 — contrato de compatibilidade e idempotencia', () => {
  it('mantem as RPCs historicas intactas', () => {
    expect(sql).not.toMatch(/create or replace function public\.create_game_normalized\s*\(p jsonb\)/)
    expect(sql).not.toMatch(/create or replace function public\.claim_participant\s*\(/)
    expect(sql).not.toMatch(/create or replace function public\.claim_participant_by_game\s*\(/)
    expect(sql).not.toMatch(/create or replace function public\.link_my_participations\s*\(/)
  })

  it('usa chave unica e lock transacional antes de criar', () => {
    expect(sql).toContain('games_owner_source_session_idx')
    expect(sql).toContain('(owner_user_id, source_session_id)')
    expect(sql).toContain('pg_advisory_xact_lock')
    const lookup = sql.indexOf('and g.source_session_id = p_session_client_id')
    const create = sql.indexOf('v_game_id := public.create_game_normalized(p)')
    expect(lookup).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(lookup)
  })

  it('nao arquiva online_sessions nem executa backfill legado amplo', () => {
    expect(sql).not.toMatch(/set\s+status\s*=\s*'archived'/i)
    expect(sql).not.toMatch(/source\s*=\s*'legacy'/i)
  })

  it('protege slot e conta contra corrida em sessao e jogo', () => {
    expect(sql).toContain('participant_claims_live_slot_active_idx')
    expect(sql).toContain('participant_claims_live_profile_active_idx')
    expect(sql).toContain('participant_claims_game_slot_active_idx')
    expect(sql).toContain('participant_claims_game_profile_active_idx')
  })

  it('bloqueia escrita direta no ledger', () => {
    expect(sql).toContain('revoke all on table public.participant_claims from public, anon, authenticated')
    expect(sql).toContain('grant select on table public.participant_claims to authenticated')
  })
})
