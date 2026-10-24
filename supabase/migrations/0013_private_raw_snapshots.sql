-- Aplicar depois de 0012 e do frontend que usa get_game_snapshot.
-- A leitura direta antiga deixa de funcionar para participantes; abas antigas
-- devem recarregar para copiar partidas. O host preserva o original integral.
drop policy if exists "raw_select_reader" on public.game_raw_snapshots;
drop policy if exists "raw_select_owner" on public.game_raw_snapshots;
create policy "raw_select_owner" on public.game_raw_snapshots for select
  using (public.is_game_owner(game_id));
