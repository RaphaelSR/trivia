# Supabase — Configuração do Banco de Dados

## Como aplicar as migrations

As migrations são aplicadas manualmente via SQL Editor do painel do Supabase.

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e abra seu projeto.
2. No menu lateral, vá em **SQL Editor** → **New query**.
3. Copie o conteúdo do arquivo `migrations/0001_online_foundation.sql`.
4. Cole na área de edição e clique em **Run**.
5. Verifique na aba **Table Editor** se as tabelas `profiles` e `game_history` foram criadas.

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

- **Único PII coletado: e-mail** — necessário para recuperar conta/histórico.
- `display_name` é apelido, não nome real. Nomes de times/jogadores no `summary`
  do histórico são o que o host digitar (na prática, apelidos).
- Senhas nunca passam pelo nosso código: o Supabase Auth armazena apenas hash (bcrypt).
- Sem telefone, documento, endereço, analytics ou trackers de terceiros.
- Exclusão limpa por construção: deletar o usuário no Auth cascateia (`on delete
  cascade`) e remove perfil + histórico.

## Escopo de modos

Os modos `demo` e `offline` estão **travados**: nada do Supabase pode alterar o
comportamento ou a UI deles. Toda feature online fica atrás de
`isSupabaseConfigured()` e do modo `online`.
