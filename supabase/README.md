# Supabase — Configuração do Banco de Dados

## Como aplicar as migrations

As migrations são aplicadas manualmente via SQL Editor do painel do Supabase.

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e abra seu projeto.
2. No menu lateral, vá em **SQL Editor** → **New query**.
3. Aplique em ordem apenas os arquivos ainda pendentes de `migrations/0001_*.sql` a `0013_*.sql`, respeitando a troca de frontend entre `0012` e `0013` descrita abaixo.
4. Cole cada arquivo inteiro na área de edição e clique em **Run**.
5. Execute os checks descritos em `docs/online/AMBIENTE-E-DEPLOY.md` antes de publicar o frontend correspondente.

`0009_live_session_claims.sql` é deliberadamente aditiva: não substitui RPCs antigas,
não arquiva `online_sessions` e não faz backfill amplo. Antes do merge, valide retry e
concorrência da finalização contra o banco autenticado.

`0010_profile_avatars.sql` adiciona campos opcionais ao perfil, o bucket público de
avatares e RPCs de identidade contextual. Ela não substitui funções de claim ou
finalização. Valide configuração do bucket, políticas owner-only, escopo das RPCs e
preservação das contagens antes de publicar o frontend.

`0011_session_lifecycle.sql` adiciona a identidade derivada da sessão a
`online_sessions` e a RPC atômica usada por autosave e keepalive. Ela não altera jogos,
claims ou snapshots normalizados. Antes de publicar, valide a função, o trigger, o
índice e que a troca de sessão arquiva a anterior e salva a próxima na mesma transação.

## Habilitar autenticação por email

No painel do Supabase:
1. Vá em **Authentication** → **Providers**.
2. Certifique-se de que **Email** está habilitado.
3. Em **Authentication** → **Sign In / Up**, mantenha **Confirm email** habilitado.
   Reservas e vínculos por e-mail exigem prova de posse do endereço; entrar sem
   confirmação não pode ser usado como prova. O app já preserva o convite no retorno
   do link de confirmação.

Se a confirmação esteve desligada, habilitá-la não verifica retroativamente contas
antigas: o Supabase também preenche `email_confirmed_at` ao auto-confirmar. Antes do
rollout, o operador precisa revisar essas contas e seus vínculos e exigir nova prova
de posse para os endereços que nunca foram verificados. Não redefina usuários ou
apague vínculos em massa por esta migration. Referência: [configuração do Auth](https://supabase.com/docs/guides/auth/general-configuration).

Ordem do rollout de privacidade (não aplicar automaticamente):

1. Confirme a configuração Auth acima e revise o período de auto-confirmação.
2. Aplique `0012_invite_and_snapshot_privacy.sql`: adiciona `get_game_snapshot` e
   protege reservas em todos os caminhos de claim, incluindo links antigos. A
   leitura antiga permanece temporariamente para compatibilidade do frontend.
3. Publique o frontend desta versão e confira cópia de partida como host e
   participante, sem contatos na resposta do participante.
4. Aplique `0013_private_raw_snapshots.sql`: restringe o snapshot bruto ao host.
   Só então a exposição antiga fica fechada. Abas antigas precisam recarregar
   antes de copiar uma partida; o jogo em andamento e os dados não são apagados.

Participantes recebem uma cópia sem campos de contato; o original do host permanece
intacto. Sem o novo RPC, o frontend novo falha fechado na cópia de uma partida,
sem recorrer à tabela bruta. Uma FK composta `NOT VALID` bloqueia novos convites
inconsistentes sem apagar linhas antigas; o auto-vínculo ignora esses pares antigos
e o operador pode revisá-los antes de validar a FK posteriormente.

Validação local: `npm run test:security:db` inicia um PostgreSQL descartável, aplica
as migrations e testa RLS, projeção, reservas, auto-vínculo e finalização. Defina
`PG_BIN` para o diretório dos binários PostgreSQL fora do Homebrew/macOS. O bootstrap
simula somente os contratos SQL mínimos de Auth/Storage; não comprova Auth HTTP,
configuração do painel nem entrega de e-mail em produção.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` na raiz do projeto e preencha:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
```

Encontre esses valores em **Settings → API** no painel do Supabase.

## Segurança

- Use **apenas a `anon key`** no frontend. Ela é pública por design.
- **NUNCA** coloque a `service_role key` em variáveis de ambiente do frontend ou no repositório.
  A `service_role key` ignora o Row Level Security e concede acesso irrestrito ao banco.
- Todas as tabelas têm **RLS habilitado** — sem isso, qualquer pessoa com a anon key
  poderia ler e escrever todos os dados de todos os usuários.
- Migrations são **idempotentes** e versionadas em `supabase/migrations/`. Nunca edite
  uma migration já aplicada — mudanças futuras viram um novo arquivo `000N_*.sql`.

## Privacidade (PII mínima)

Postura de dados deste projeto (hobby game, sem dinheiro envolvido):

- **PII mínimo:** e-mail para recuperar conta/histórico e foto de perfil opcional escolhida pelo usuário.
- `display_name` é apelido, não nome real. Nomes de times/jogadores no `summary`
  do histórico são o que o host digitar (na prática, apelidos).
- Senhas nunca passam pelo nosso código: o Supabase Auth armazena apenas hash (bcrypt).
- Sem telefone, documento, endereço, analytics ou trackers de terceiros.
- Exclusão limpa por construção: deletar o usuário no Auth cascateia (`on delete
  cascade`) e remove perfil + histórico.

## Escopo de modos

`demo` nunca sincroniza. `offline` continua jogável sem conta e pode fazer backup de
sessão quando o usuário já está logado. QR, claim ao vivo e identidade visual ficam
exclusivamente no modo `online` autenticado; falhas desses recursos não bloqueiam o jogo.
