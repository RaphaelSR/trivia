# Módulo Online — Infraestrutura e Custos

> **Status:** Planejamento — ainda não implementado.

---

## 1. Princípio: Custo Zero, Complexidade Mínima

Todo o stack foi escolhido para rodar gratuitamente, com a menor quantidade possível de serviços e peças móveis. Este é um projeto pessoal — a arquitetura deve refletir isso.

**Custo mensal total: $0**

---

## 2. Sobre Segurança e a Chave do Supabase

Antes de definir a arquitetura, vale esclarecer um ponto que gera confusão:

O Supabase tem duas chaves:

| Chave | Nome | Onde fica | O que faz |
|---|---|---|---|
| `anon key` | Chave pública | Frontend (seguro) | Identifica o projeto; o RLS limita o acesso |
| `service_role key` | Chave privada | Servidor apenas | Bypassa o RLS; acesso total ao banco |

**A `anon key` no frontend é segura por design** — é assim que o Supabase foi projetado. O que protege os dados são as políticas de RLS, não esconder essa chave. Colocar a `anon key` no código do frontend é correto e intencional.

O que nunca vai para o frontend é a `service_role key`. Ela só é necessária para as poucas operações que precisam de acesso irrestrito ao banco — e para essas, existe a solução certa sem precisar de um servidor separado.

---

## 3. Arquitetura Final

```
┌──────────────────────────────────────────────────────────────┐
│                    USUÁRIO                                   │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              FRONTEND — React + Vite                         │
│              Vercel (Hobby Plan — gratuito)                  │
└──────────┬───────────────────────────────┬───────────────────┘
           │                               │
    99% das operações              2-3 operações especiais
    (leituras, realtime,           (finalizar jogo, claim)
     auth, scores ao vivo)                 │
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│                                                              │
│  ┌─────────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │  Database   │  │   Auth    │  │   Edge Functions     │  │
│  │ PostgreSQL  │  │ + sessões │  │  (service_role key)  │  │
│  │    + RLS    │  │           │  │  finalize_game()     │  │
│  └─────────────┘  └───────────┘  │  claim_participant() │  │
│                                  └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Realtime — sync ao vivo via PostgreSQL replication │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Tudo vive dentro do Supabase.** Não há serviço de API separado para configurar, manter ou fazer deploy.

---

## 4. Supabase Edge Functions

Edge Functions são funções TypeScript que rodam dentro do próprio Supabase, com acesso à `service_role key` via variável de ambiente. São chamadas pelo frontend como se fossem endpoints de API normais.

### Quando usar

Só para as operações que precisam de `service_role` ou que envolvem múltiplas tabelas de forma atômica:

| Função | O que faz |
|---|---|
| `finalize-game` | Calcula vencedor, MVP, atualiza `games` com os resultados finais |
| `claim-participant` | Valida o token, vincula `user_id` ao participante, invalida o token |

O resto (criar jogo, adicionar participante, registrar resposta, ler leaderboard) vai direto pelo SDK com a `anon key` e o RLS cuida da segurança.

### Como funciona no código

```ts
// Frontend chama assim:
const { data, error } = await supabase.functions.invoke('finalize-game', {
  body: { gameId: 'uuid-do-jogo' }
});
```

```ts
// A função no Supabase (supabase/functions/finalize-game/index.ts):
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Usa service_role — acesso total, seguro porque roda no servidor
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const { gameId } = await req.json();

  // Calcula vencedor...
  // Atualiza games...
  // Retorna resultado

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Limites gratuitos

| Item | Limite gratuito |
|---|---|
| Invocações | 500.000 / mês |
| Duração por execução | 150 segundos |
| Memória | 256 MB |

Para um grupo de amigos jogando trivia, esses limites nunca serão atingidos.

---

## 5. Cada Serviço em Detalhe

### 5.1 Supabase (Database + Auth + Realtime + Edge Functions)

| Item | Limite gratuito |
|---|---|
| Projetos | 2 |
| Banco de dados | 500 MB |
| Transferência | 5 GB / mês |
| Auth (usuários) | Ilimitado |
| Realtime (conexões) | 200 simultâneas |
| Edge Functions | 500.000 invocações / mês |

**⚠️ Atenção:** projetos são pausados após 1 semana de inatividade. Não custa nada — só precisa clicar "Resume" no dashboard. Durante desenvolvimento ativo, não acontece.

**Trava de custo:** Billing → Spending Limits → $0 no dashboard do Supabase.

---

### 5.2 Vercel (Frontend)

| Item | Limite gratuito (Hobby) |
|---|---|
| Bandwidth | 100 GB / mês |
| Builds automáticos | 100 / dia |
| Domínio | `*.vercel.app` grátis |

**Trava de custo:** plano Hobby não cobra automaticamente. Upgrade para Pro ($20/mês) seria manual e explícito.

---

## 6. Por que não ElysiaJS (por ora)

ElysiaJS é um framework interessante, especialmente para quem está aprendendo. Para este projeto, ele não é a escolha certa no momento por uma razão simples: **adicionaria um serviço inteiro (Cloudflare Workers) para fazer o trabalho de 2 funções**.

As Edge Functions do Supabase resolvem exatamente o mesmo problema — operações seguras com `service_role` — sem precisar de:
- Conta no Cloudflare
- Configuração do Wrangler
- Deploy separado
- Variáveis de ambiente em outro lugar
- Monitoramento de outro serviço

Se o projeto crescer e precisar de uma API com muitos endpoints, lógica complexa ou integração com outros serviços, ElysiaJS num Worker ou num servidor dedicado faz sentido. Por agora, é excesso.

---

## 7. Resumo de Risco de Custo

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Supabase cobrar | Baixíssima | Spending limit = $0 |
| Vercel cobrar | Zero | Plano Hobby não cobra automaticamente |
| Projeto Supabase pausar | Média (dev inativo) | Reativar em 30s no dashboard |

---

## 8. Ordem de Início — Por Onde Começar

### Fase 1 — Supabase (sem código)
> Objetivo: banco funcionando com o schema correto e visível no Table Editor.

1. Criar projeto `trivia-dev` em [supabase.com](https://supabase.com)
2. Rodar as migrations no SQL Editor (ver `ARQUITETURA-ONLINE.md`)
3. Habilitar **Anonymous sign-ins**: Auth → Settings
4. Configurar **Spending Limit = $0**: Billing → Spending Limits
5. Copiar URL e `anon key`

**Resultado:** todas as tabelas visíveis no Table Editor. Você pode inserir dados manualmente e ver tudo funcionando antes de escrever uma linha de código.

---

### Fase 2 — Conectar o Frontend ao Supabase
> Objetivo: app React lendo e escrevendo no Supabase em modo online.

1. `npm install @supabase/supabase-js`
2. Criar variáveis de ambiente (`.env.local`)
3. Criar `src/modules/game/infrastructure/supabase/client.ts`
4. Implementar `SupabaseSessionRepository` (substitui o cache online local)
5. Testar: criar um jogo no app → ver aparecer no Table Editor

**Resultado:** modo online salvando dados reais. Leaderboard básico funcionando.

---

### Fase 3 — Edge Functions para Operações Especiais
> Objetivo: finalização de jogo e claim de conta funcionando com segurança.

1. Instalar Supabase CLI: `npm install -g supabase`
2. `supabase init` dentro do projeto
3. `supabase functions new finalize-game`
4. Implementar a lógica de finalização
5. Testar localmente: `supabase functions serve`
6. Deploy: `supabase functions deploy finalize-game`

**Resultado:** fluxo completo funcionando, `service_role key` nunca exposta ao frontend.

---

### Fase 4 — Produção
> Objetivo: tudo em URLs públicas e estáveis.

1. Criar projeto `trivia-prod` no Supabase + rodar migrations
2. Configurar Spending Limit = $0 no projeto prod
3. Conectar repositório ao Vercel (deploy automático)
4. Configurar variáveis de ambiente no Vercel (apontando para `trivia-prod`)
5. Deploy das Edge Functions no projeto prod

---

## 9. Sobre o Worktree do Git

Para não misturar com outros projetos em andamento:

```bash
# Dentro do repositório do trivia
git worktree add ../trivia-feature-online feature/online-module

# Trabalhar na pasta isolada
cd ../trivia-feature-online

# Quando terminar e mergear, limpar
git worktree remove ../trivia-feature-online
```

O worktree compartilha o histórico git mas tem sua própria pasta e branch — zero interferência com outros projetos ou com a branch principal.
