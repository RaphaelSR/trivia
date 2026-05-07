# Módulo Online — Ambiente e Deploy

> **Status:** Planejamento — ainda não implementado.

---

## 1. Visão Geral

O projeto Trivia é uma aplicação de página única (SPA) construída com Vite + React. O backend é inteiramente gerenciado pelo Supabase — não há servidor próprio para manter ou publicar. O deploy envolve dois destinos independentes:

| Parte | O que é | Onde fica |
|---|---|---|
| **Frontend** | App React compilado | Vercel (ou Netlify) |
| **Backend** | Banco + Auth + Realtime | Supabase (cloud) |

Manter esses dois separados é simples: o frontend sabe onde o Supabase está através de variáveis de ambiente. Trocar de ambiente (dev → prod) é trocar essas variáveis.

---

## 2. Ambientes: Development e Production

A regra de ouro é: **dois projetos Supabase separados, um para cada ambiente**. Nunca usar o projeto de produção para desenvolvimento.

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│     DEVELOPMENT             │    │     PRODUCTION              │
│                             │    │                             │
│  Supabase: trivia-dev       │    │  Supabase: trivia-prod      │
│  Frontend: localhost:5173   │    │  Frontend: trivia.vercel.app│
│  .env.local (não commitado) │    │  .env.production (ou vars   │
│                             │    │   da plataforma de deploy)  │
└─────────────────────────────┘    └─────────────────────────────┘
```

Isso garante que:
- Testes e experimentos em desenvolvimento não afetam dados reais.
- O banco de produção nunca recebe queries de código em desenvolvimento.
- As credenciais de cada ambiente ficam isoladas.

---

## 3. Criando os Projetos no Supabase

### Passo a passo

1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **New Project**.
3. Escolha um nome (ex: `trivia-dev` e depois `trivia-prod`).
4. Escolha a região mais próxima (South America - São Paulo disponível).
5. Defina uma senha forte para o banco (guardar em lugar seguro).
6. Aguarde o projeto inicializar (~2 minutos).

Repita para criar o segundo projeto (`trivia-prod`).

### Onde encontrar as credenciais

Em cada projeto Supabase: **Project Settings → API**

```
Project URL:  https://<project-ref>.supabase.co
anon key:     eyJ... (chave pública, vai para o frontend)
service_role: eyJ... (chave privada, NUNCA vai para o frontend)
```

---

## 4. Variáveis de Ambiente

### Estrutura de arquivos

```
trivia/
├── .env.local           ← desenvolvimento local (não commitado no git)
├── .env.production      ← produção (pode ser commitado sem secrets, ou usar vars da plataforma)
└── .gitignore           ← deve conter .env.local e .env*.local
```

### `.env.local` (desenvolvimento)

```env
VITE_SUPABASE_URL=https://<ref-do-projeto-dev>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-do-projeto-dev>
```

### `.env.production` (produção)

```env
VITE_SUPABASE_URL=https://<ref-do-projeto-prod>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-do-projeto-prod>
```

> **Importante:** a `anon key` é segura para ficar no código — é pública por design do Supabase. A `service_role key` nunca deve aparecer em nenhum desses arquivos.

### Adicionar ao `.gitignore`

```gitignore
# Variáveis de ambiente locais
.env.local
.env.*.local
```

### Como usar no código

```ts
// src/modules/game/infrastructure/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 5. Rodando as Migrations (Schema do Banco)

As migrations são os arquivos SQL que criam as tabelas, políticas de segurança e triggers. Devem ser rodadas em cada projeto Supabase (dev e prod separadamente).

### Opção A — Via SQL Editor no Dashboard (mais simples para começar)

1. Acesse o projeto no dashboard do Supabase.
2. Vá em **SQL Editor → New query**.
3. Cole o SQL de cada migration e execute.
4. Repita para o projeto de produção quando estiver pronto.

### Opção B — Via Supabase CLI (recomendado para manter histórico)

A CLI permite versionar as migrations junto com o código, tornando o processo repetível.

**Instalação:**
```bash
npm install -g supabase
```

**Inicialização no projeto (feito uma vez):**
```bash
cd trivia
supabase init
# Cria a pasta supabase/ com supabase/migrations/ e supabase/config.toml
```

**Criar uma nova migration:**
```bash
supabase migration new create_initial_schema
# Cria: supabase/migrations/<timestamp>_create_initial_schema.sql
```

Edite o arquivo gerado com o SQL das tabelas (ver `ARQUITETURA-ONLINE.md`, seção 3).

**Linkar ao projeto remoto:**
```bash
supabase login
supabase link --project-ref <ref-do-projeto-dev>
```

**Aplicar migrations:**
```bash
supabase db push
# Envia todas as migrations pendentes para o projeto linkado
```

**Para produção, re-linkar e aplicar:**
```bash
supabase link --project-ref <ref-do-projeto-prod>
supabase db push
```

### Estrutura de migrations sugerida

```
supabase/
└── migrations/
    ├── 001_create_profiles.sql
    ├── 002_create_games.sql
    ├── 003_create_teams.sql
    ├── 004_create_participants.sql
    ├── 005_create_answers.sql
    ├── 006_create_championships.sql
    ├── 007_create_championship_games.sql
    ├── 008_rls_policies.sql
    └── 009_triggers.sql
```

Cada migration é incremental e não destrutiva — nunca altera o que já foi aplicado.

---

## 6. Deploy do Frontend

### Opção recomendada: Vercel

O Vercel é a opção mais simples para projetos Vite/React. Tem plano gratuito generoso e deploy automático ao fazer push no git.

**Passo a passo:**

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub.
2. Clique em **Add New Project** → importe o repositório do Trivia.
3. Vercel detecta automaticamente que é um projeto Vite.
4. Configure as variáveis de ambiente:
   - Vá em **Settings → Environment Variables**
   - Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores de produção.
5. Clique em **Deploy**.

**Deploy automático:** a cada `git push` na branch `main`, o Vercel reconstrói e publica automaticamente.

**Preview deploys:** cada Pull Request recebe uma URL de preview separada — útil para testar antes de publicar em produção.

### Alternativa: Netlify

Funciona de forma muito similar ao Vercel. A configuração de variáveis de ambiente fica em **Site Settings → Environment Variables**.

---

## 7. Configurando Auth no Painel do Supabase

Após criar o projeto, algumas configurações de Auth precisam ser feitas manualmente no dashboard:

**Supabase Dashboard → Authentication → Providers:**

- **Email:** habilitado por padrão. Ajustar se quiser desabilitar confirmação por email inicialmente.
- **Anonymous sign-ins:** habilitar em **Authentication → Settings → Enable anonymous sign-ins**. (Necessário para usuários sem conta terem um `uid` de sessão nas RLS policies.)

**Supabase Dashboard → Authentication → URL Configuration:**

- **Site URL:** URL do frontend em produção (ex: `https://trivia.vercel.app`)
- **Redirect URLs:** adicionar URLs permitidas para redirecionamento pós-login (ex: `https://trivia.vercel.app/**` e `http://localhost:5173/**`)

---

## 8. Checklist: Do Zero ao Ar

### Desenvolvimento

- [ ] Criar projeto `trivia-dev` no Supabase
- [ ] Copiar URL e anon key para `.env.local`
- [ ] Adicionar `.env.local` ao `.gitignore`
- [ ] Inicializar Supabase CLI no projeto (`supabase init`)
- [ ] Escrever e rodar migrations no projeto dev
- [ ] Habilitar Anonymous sign-ins no projeto dev
- [ ] Instalar SDK: `npm install @supabase/supabase-js`
- [ ] Remover Firebase: `npm uninstall firebase`, deletar `src/lib/firebase.ts`
- [ ] Implementar `src/modules/game/infrastructure/supabase/client.ts`
- [ ] Testar conexão básica (read de qualquer tabela)

### Produção

- [ ] Criar projeto `trivia-prod` no Supabase
- [ ] Rodar as mesmas migrations no projeto prod
- [ ] Habilitar Anonymous sign-ins no projeto prod
- [ ] Configurar Site URL e Redirect URLs no projeto prod
- [ ] Criar repositório no GitHub (se ainda não existir)
- [ ] Conectar repositório ao Vercel
- [ ] Configurar variáveis de ambiente no Vercel (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de produção)
- [ ] Fazer deploy e verificar conexão com Supabase prod
- [ ] Verificar que RLS está ativo em todas as tabelas

---

## 9. Monitoramento e Manutenção

### Supabase Dashboard

O dashboard do Supabase oferece:
- **Table Editor:** ver e editar dados como planilha, sem precisar de SQL.
- **SQL Editor:** rodar queries customizadas diretamente.
- **Logs:** ver requisições, erros de auth, queries lentas.
- **Auth Users:** ver todos os usuários registrados.

### Limites do Free Plan

| Recurso | Limite gratuito |
|---|---|
| Banco de dados | 500 MB |
| Transferência | 5 GB/mês |
| Armazenamento de arquivos | 1 GB |
| Auth (usuários) | Ilimitado |
| Realtime (conexões simultâneas) | 200 |
| Projetos ativos | 2 |

Para um jogo de trivia com ~20 participantes por sessão e algumas dezenas de jogos por ano, esses limites são mais do que suficientes — provavelmente nunca serão atingidos.

### Backups

O Supabase Free Plan não inclui backups automáticos (disponível no plano pago). Para o contexto atual, uma alternativa simples é exportar os dados periodicamente via SQL Editor:

```sql
-- Exportar todos os resultados de jogos
COPY (SELECT * FROM games) TO STDOUT WITH CSV HEADER;
```

Ou usar o **Table Editor → Export to CSV** para cada tabela.
