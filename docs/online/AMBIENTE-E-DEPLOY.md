# Online: Ambiente e Deploy

## Ambientes

O frontend local roda em `http://localhost:5173/`. A produção é publicada pelo GitHub Actions em `https://raphaelsr.github.io/trivia/`. O backend é um projeto Supabase acessado pelas variáveis:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`.env.local` não entra no Git. Nunca usar `service_role` no Vite.

## Ordem segura de publicacao

1. aplicar a migration nova no Supabase pelo SQL Editor;
2. executar as consultas de verificação da PR;
3. validar claims e repetição da finalização com contas de teste;
4. somente então mergear o frontend;
5. aguardar testes e deploy de GitHub Pages;
6. fazer smoke test de produção.

Frontend novo antes da migration degrada o painel de convite com retry e não bloqueia o jogo, mas a ordem acima evita entregar um recurso indisponível.

## Migrations

Arquivos versionados: `supabase/migrations/0001_*.sql` até `0009_live_session_claims.sql`. `0009` é aditiva: não substitui RPCs históricas, não arquiva sessões e não executa backfill amplo.

Como o projeto não mantém Supabase CLI/Docker local configurado, a validação SQL final deve ocorrer em uma transação ou ambiente de teste no painel autenticado. Antes da produção, validar especialmente:

- duas chamadas de finalização retornam o mesmo `game_id`;
- chamadas concorrentes geram apenas uma linha em `games`;
- jogos e claims históricos permanecem inalterados;
- duas contas não ocupam o mesmo slot;
- revogar registra ator/data e libera nova reivindicação.

## Checks do frontend

```bash
npm test -- --runInBand
npm run lint
npm run build
```

Também testar `demo`, `offline` e `online`, desktop e 375 px. `demo/offline` não podem chamar RPCs de convite.

## Rollback

O rollback preferido do frontend é reverter o commit. As colunas/tabela aditivas da migration podem permanecer sem uso; não remover dados reais automaticamente. Qualquer rollback destrutivo do banco exige backup e revisão manual.
