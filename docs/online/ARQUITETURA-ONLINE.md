# Módulo Online — Arquitetura e Banco de Dados

> **Status:** Planejamento / Rascunho — ainda não implementado.
> Este documento registra as decisões de design antes da implementação.

---

## 1. Objetivo

Persistir sessões de jogo ("partidas") de modo que seja possível:

- Recuperar qualquer jogo individual pelo seu ID.
- Agrupar jogos em coleções arbitrárias (campeonatos, temporadas, séries) sem depender de datas.
- Agregar pontuações por qualquer seleção de jogos: quem ganhou mais, quem somou mais pontos, qual equipe foi mais vitoriosa.
- Ter histórico permanente, acessível além da sessão do navegador.
- Suportar login opcional — o jogo funciona sem conta, mas quem tem conta ganha funcionalidades extras.
- Permitir que um participante criado sem conta **vincule retroativamente** seu histórico quando criar uma conta futuramente.

---

## 2. Princípio de Design: Agrupamento Explícito, não por Data

O agrupamento de jogos **não é definido pelo calendário** — é uma decisão explícita de quem organiza.

> Exemplo real: o campeonato de 2025 teve 3 jogos durante o ano, mas o último foi remarcado para fevereiro de 2026. A "temporada 2025" ainda assim inclui esse jogo — e isso precisa ser possível sem gambiarras.

A solução é uma entidade `championships`: uma coleção nomeada de jogos, criada manualmente, sem datas de início ou fim obrigatórias. Um jogo pode pertencer a zero, um ou vários campeonatos. Um campeonato pode ter qualquer número de jogos.

A data do jogo (`played_at`) ainda existe como referência informacional — para saber quando algo aconteceu — mas não é usada como critério de agrupamento.

---

## 3. Schema do Banco de Dados

### 3.1 `profiles` — Usuários

Extensão da tabela `auth.users` do Supabase. Criada automaticamente via trigger quando alguém registra.

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email        text,
  avatar_url   text,
  created_at   timestamptz default now()
);
```

**Notas:**
- Login é opcional. Quem não tem conta simplesmente não aparece aqui.
- Supabase Auth suporta login anônimo — o host pode jogar sem email, mas ainda ter um `uid` de sessão.

---

### 3.2 `championships` — Coleções de Jogos ⭐ Entidade Nova

Representa um agrupamento arbitrário de jogos: um campeonato, uma temporada, uma série especial — qualquer coisa que o organizador queira nomear.

```sql
create table championships (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,       -- ex: "Campeonato 2025", "Copa de Inverno"
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
```

**Sem campos de data de início/fim.** O período de um campeonato é implicitamente definido pelos jogos que ele contém — não o contrário.

---

### 3.3 `championship_games` — Vínculo entre Campeonatos e Jogos

Tabela de junção N:N. Um campeonato tem vários jogos; um jogo pode estar em vários campeonatos (ou em nenhum).

```sql
create table championship_games (
  championship_id uuid not null references championships(id) on delete cascade,
  game_id         uuid not null references games(id) on delete cascade,
  added_at        timestamptz default now(),
  primary key (championship_id, game_id)
);
```

---

### 3.4 `games` — Partidas

```sql
create table games (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  join_code       text unique not null,         -- código curto para entrar (ex: "ALFA7")
  host_user_id    uuid references profiles(id), -- nullable: host pode não ter conta
  status          text not null default 'lobby'
                  check (status in ('lobby','active','finished')),
  theme           text not null default 'dark',
  played_at       timestamptz,                  -- quando aconteceu (informativo, não agrupa)
  finished_at     timestamptz,
  winner_team_id  uuid,                         -- preenchido ao finalizar
  mvp_participant_id uuid,                      -- preenchido ao finalizar
  created_at      timestamptz default now()
);
```

**Nota sobre `played_at`:** esse campo existe para referência ("quando foi esse jogo?") mas não é usado como critério de agrupamento. O agrupamento é feito via `championship_games`.

---

### 3.5 `teams` — Equipes por Jogo

```sql
create table teams (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  name        text not null,
  color       text not null,
  "order"     int not null,
  final_score int not null default 0
);
```

---

### 3.6 `participants` — Jogadores por Jogo

Representa **uma pessoa em um jogo específico**, independente de ter conta ou não.

```sql
create table participants (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  team_id       uuid references teams(id),
  display_name  text not null,                -- nome como o host adicionou
  role          text not null default 'player'
                check (role in ('host','assistant','player')),
  user_id       uuid references profiles(id), -- NULL enquanto não vinculado
  claim_token   uuid unique default gen_random_uuid(), -- token de vinculação
  final_score   int not null default 0,
  answers_count int not null default 0,
  created_at    timestamptz default now()
);
```

**Os campos `user_id` e `claim_token` são o mecanismo de vinculação de conta** — explicado em detalhe na seção 5.

---

### 3.7 `answers` — Respostas (Audit Log)

Registro imutável de cada resposta. Serve como trilha de auditoria e base para recalcular scores.

```sql
create table answers (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references games(id) on delete cascade,
  participant_id  uuid not null references participants(id),
  team_id         uuid not null references teams(id),
  tile_id         text not null,
  film            text not null,
  question        text,
  points_awarded  int not null,
  source          text not null check (source in ('trivia','mimica')),
  mimica_mode     text,
  turn_number     int not null,
  round_number    int not null,
  answered_at     timestamptz default now()
);
```

---

## 4. Queries de Leaderboard

### 4.1 Todos os jogos de um campeonato

```sql
SELECT g.*
FROM games g
JOIN championship_games cg ON cg.game_id = g.id
WHERE cg.championship_id = 'uuid-do-campeonato'
ORDER BY g.played_at;
```

### 4.2 Ranking de pontuação de um campeonato

```sql
-- Quem somou mais pontos em todos os jogos do campeonato?
SELECT
  p.display_name,
  p.user_id,
  SUM(p.final_score)       AS total_score,
  COUNT(DISTINCT p.game_id) AS games_played
FROM participants p
JOIN championship_games cg ON cg.game_id = p.game_id
WHERE cg.championship_id = 'uuid-do-campeonato'
  AND p.role = 'player'
GROUP BY p.display_name, p.user_id
ORDER BY total_score DESC;
```

### 4.3 Equipe mais vitoriosa de um campeonato

```sql
SELECT
  t.name AS team_name,
  COUNT(*) AS wins
FROM games g
JOIN championship_games cg ON cg.game_id = g.id
JOIN teams t ON t.id = g.winner_team_id
WHERE cg.championship_id = 'uuid-do-campeonato'
GROUP BY t.name
ORDER BY wins DESC;
```

### 4.4 Histórico completo de um usuário com conta

```sql
-- Todos os jogos que o usuário participou, em qualquer campeonato
SELECT
  g.title,
  g.played_at,
  p.display_name,
  p.final_score,
  p.answers_count,
  t.name AS team_name,
  CASE WHEN g.winner_team_id = p.team_id THEN true ELSE false END AS won,
  ch.name AS championship_name
FROM participants p
JOIN games g      ON g.id = p.game_id
LEFT JOIN teams t ON t.id = p.team_id
LEFT JOIN championship_games cg ON cg.game_id = g.id
LEFT JOIN championships ch      ON ch.id = cg.championship_id
WHERE p.user_id = 'uuid-do-usuario'
ORDER BY g.played_at DESC;
```

### 4.5 Seleção livre de jogos (sem campeonato formal)

Se quiser agregar jogos avulsos sem criar um campeonato:

```sql
-- Passa uma lista de IDs diretamente
SELECT display_name, SUM(final_score) AS total
FROM participants
WHERE game_id = ANY(ARRAY['id1','id2','id3']::uuid[])
  AND role = 'player'
GROUP BY display_name
ORDER BY total DESC;
```

---

## 5. Fluxo de Vinculação de Conta (Account Claiming)

### Cenário

> O host cria um jogo com 10 jogadores, incluindo "Raphael". Raphael não tem conta. O jogo acontece, Raphael acumula pontos. Depois, Raphael cria uma conta e quer recuperar sua pontuação.

### Mecanismo

**Passo 1 — Host cria o jogo e adiciona participantes**
```sql
INSERT INTO participants (game_id, display_name, role, team_id)
VALUES ('game-uuid', 'Raphael', 'player', 'team-uuid');
-- claim_token gerado automaticamente (gen_random_uuid())
-- user_id = NULL
```

**Passo 2 — O jogo acontece**
Pontos salvos normalmente. Não importa que Raphael não tenha conta.

**Passo 3 — Raphael cria conta e recebe o claim_token**

Formas de entregar o token para Raphael (a decidir):
- Link compartilhado pelo host: `trivia.app/claim?token=<uuid>`
- QR Code gerado ao final do jogo por participante
- Código alfanumérico curto derivado do token

**Passo 4 — Vinculação**
```sql
UPDATE participants
SET
  user_id     = 'uuid-da-conta-nova-do-raphael',
  claim_token = null   -- invalida o token após uso
WHERE claim_token = 'token-recebido'
  AND user_id IS NULL; -- garante que só pode ser reivindicado uma vez
```

A partir daí, qualquer query por `user_id` já inclui esse jogo no histórico de Raphael.

---

## 6. Realtime durante o Jogo

Supabase Realtime via PostgreSQL replication — sem polling, sem custo extra no free tier.

```ts
// Exemplo: host e clientes recebem updates de score ao vivo
const channel = supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'teams',
    filter: `game_id=eq.${gameId}`
  }, (payload) => updateTeamScore(payload.new))
  .subscribe();
```

---

## 7. Estrutura de Serviços no Código

Sem backend REST separado. O cliente React fala direto com o Supabase via SDK (`@supabase/supabase-js`).

```
src/modules/game/infrastructure/
├── supabase/
│   ├── client.ts                    ← inicialização do supabaseClient
│   ├── game.service.ts              ← createGame, updateStatus, finalizeGame
│   ├── championship.service.ts      ← createChampionship, addGame, leaderboard
│   ├── participant.service.ts       ← addParticipant, claimParticipant
│   ├── answer.service.ts            ← recordAnswer (atualiza score via transaction)
│   └── realtime.service.ts          ← subscribeToGame, subscribeToTeams
├── supabase-session.repository.ts   ← implementa SessionRepository
└── repository.factory.ts            ← já existe, retorna o certo por modo
```

---

## 8. O que Não Muda no Projeto

- **Domain layer** (`src/modules/game/domain/`) — zero alterações.
- **Application hooks** (`src/modules/game/application/`) — mínimas adaptações para async/realtime.
- **Modo offline** — continua funcionando via `LocalSessionRepository`.
- **Cache online atual** — deve ser substituído por `SupabaseSessionRepository` sem alterar a UI.

---

## 9. Próximos Passos (quando avançar para implementação)

1. Criar projeto no [Supabase](https://supabase.com) — Free Plan.
2. Rodar as migrations das seções 3.1 a 3.7.
3. Habilitar Auth com Email + Login Anônimo no painel.
4. Instalar SDK: `npm install @supabase/supabase-js`
5. Implementar `supabase/client.ts` com as env vars.
6. Implementar `SupabaseSessionRepository` sobre os novos serviços.
7. Trocar o factory para usar Supabase no modo `online`.
8. Implementar `game.service.ts` e `championship.service.ts`.
9. Implementar o fluxo de claim (escolher formato do token para o usuário final).
10. Configurar Row Level Security no painel do Supabase.

---

## 10. Decisões em Aberto

| Questão | Opções | Status |
|---|---|---|
| Formato do claim_token para o usuário | Link / QR Code / Código curto | Em aberto |
| Pode reivindicar múltiplos jogos de uma vez? | Lista vs. um por vez | Em aberto |
| Realtime para todos os clientes ou só host? | Todos vs. só host | Começa com só host |
| Board completo persistido? | JSONB vs. só scores + answers | Só scores por ora |
| Múltiplos hosts simultâneos? | Sim vs. lock por jogo | Um host por jogo (MVP) |
| Campeonato obrigatório por jogo? | Sim vs. opcional | Opcional — jogo pode existir sem campeonato |
