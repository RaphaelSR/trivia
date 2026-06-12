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
3. Em **Authentication** → **Email Templates**, ajuste os textos de confirmação se necessário.

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
