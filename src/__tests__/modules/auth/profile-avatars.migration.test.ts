import fs from 'fs'
import path from 'path'

const sql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/0010_profile_avatars.sql'),
  'utf8',
)

describe('migration 0010 — avatares e identidade escopada', () => {
  it('cria bucket publico WebP de 1 MB sem tornar escrita publica', () => {
    expect(sql).toContain("'profile-avatars'")
    expect(sql).toContain('1048576')
    expect(sql).toContain("array['image/webp']")
    expect(sql).toContain('profile_avatars_insert_own_folder')
    expect(sql).toContain('profile_avatars_delete_own_folder')
    expect(sql).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)")
    expect(sql).toContain('owner_id = (select auth.uid()::text)')
  })

  it('usa caminho opaco e nao guarda avatar no snapshot do jogo', () => {
    expect(sql).toContain('profiles_avatar_path_shape')
    expect(sql).toContain("avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.webp$'")
    expect(sql).not.toContain("alter table public.online_sessions add column avatar")
    expect(sql).not.toContain("alter table public.games add column avatar")
  })

  it('expoe somente identidade propria, da sessao do host ou de jogo compartilhado', () => {
    expect(sql).toContain('get_my_profile_identity')
    expect(sql).toContain('list_live_participant_identities')
    expect(sql).toContain("os.user_id = auth.uid()")
    expect(sql).toContain('list_game_participant_identities')
    expect(sql).toContain('g.owner_user_id = auth.uid()')
    expect(sql).toContain('mine.profile_id = auth.uid()')
    expect(sql).toContain("set search_path = ''")
  })

  it('nao substitui RPCs historicas nem de claims', () => {
    expect(sql).not.toContain('create or replace function public.create_game_normalized(')
    expect(sql).not.toContain('create or replace function public.claim_session_participant(')
    expect(sql).not.toContain('create or replace function public.claim_participant(')
  })
})
