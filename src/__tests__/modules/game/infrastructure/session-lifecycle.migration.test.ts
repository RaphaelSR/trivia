import fs from 'node:fs'
import path from 'node:path'

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/0011_session_lifecycle.sql'),
  'utf8',
)

describe('migration 0011 — ciclo de vida de sessões', () => {
  it('materializa a identidade do cliente e a mantém por trigger', () => {
    expect(sql).toMatch(/add column if not exists session_client_id text/i)
    expect(sql).toMatch(/new\.session_client_id := nullif\(new\.session ->> 'id'/i)
    expect(sql).toMatch(/before insert or update of session/i)
  })

  it('troca a sessão ativa atomicamente e preserva a anterior como arquivada', () => {
    expect(sql).toMatch(/create or replace function public\.save_online_session_snapshot/i)
    expect(sql).toMatch(/pg_advisory_xact_lock/i)
    expect(sql).toMatch(/set status = 'archived'/i)
    expect(sql).toMatch(/set status = 'active'/i)
  })

  it('usa auth.uid, search_path vazio e não concede mutação a anon', () => {
    expect(sql).toMatch(/v_user_id uuid := auth\.uid\(\)/i)
    expect(sql).toMatch(/security definer\s+set search_path = ''/i)
    expect(sql).toMatch(/revoke all on function[\s\S]+from public, anon/i)
    expect(sql).toMatch(/grant execute on function[\s\S]+to authenticated/i)
  })
})
