# Supabase — Configuração do Banco de Dados

## Como aplicar as migrations

As migrations são aplicadas manualmente via SQL Editor do painel do Supabase.

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e abra seu projeto.
2. No menu lateral, vá em **SQL Editor** → **New query**.
3. Aplique em ordem apenas os arquivos ainda pendentes de `migrations/0001_*.sql` a `0011_*.sql`.
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
3. Em **Authentication** → **Sign In / Up**, desative **Confirm email** — o cadastro
   passa a logar direto, sem clique em link de confirmação (decisão de produto:
   onboarding não-bloqueante para um jogo de hobby).

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
