# Módulo Online — Modos de Uso e Regras de Negócio

> **Status:** Planejamento — ainda não implementado.

---

## 1. Premissa Fundamental

O módulo online foi desenhado com uma regra central: **nenhuma entidade depende obrigatoriamente de outra para existir**.

- Um jogo pode existir sem campeonato.
- Um campeonato pode existir sem jogos.
- Um participante pode existir sem conta de usuário.
- Uma conta pode existir sem ter participado de nenhum jogo.

Essa independência garante que o sistema nunca force o organizador a seguir um fluxo rígido, e que os dados possam ser reorganizados no futuro sem grandes migrações.

---

## 2. Entidades e o que Representam

| Entidade | O que é | Obrigatório? |
|---|---|---|
| `games` | Uma partida de trivia | Sim — é o núcleo |
| `teams` | Equipes de uma partida | Sim dentro de um jogo |
| `participants` | Uma pessoa em uma partida | Sim dentro de um jogo |
| `answers` | Cada resposta dada | Criado automaticamente durante o jogo |
| `championships` | Um agrupamento nomeado de jogos | Não — completamente opcional |
| `championship_games` | Vínculo entre jogo e campeonato | Não — criado quando faz sentido |
| `profiles` | Conta de usuário | Não — login é opcional |

---

## 3. Modos de Uso

### Modo A — Jogo Avulso (sem campeonato, sem conta)

O caso mais simples. O host cria um jogo, adiciona participantes pelo nome, joga, termina. Os dados ficam salvos e podem ser consultados depois, mas não pertencem a nenhum agrupamento formal.

```
Host cria jogo → adiciona participantes → joga → finaliza
↓
Dados salvos em: games, teams, participants, answers
↓
Pode ser consultado individualmente a qualquer momento
Pode ser adicionado a um campeonato futuramente se quiser
```

**Quando usar:** sessões únicas, jogos experimentais, ou quando ainda não se sabe se haverá mais jogos do mesmo grupo.

---

### Modo B — Jogo como parte de um Campeonato

O organizador cria um campeonato primeiro (ou já tem um criado) e vai adicionando jogos a ele conforme acontecem. A ordem de criação é livre:

**Variante B1 — Campeonato criado antes dos jogos**
```
Cria championship "Campeonato 2026"
↓
Jogo 1 acontece → finalizado → adicionado ao campeonato
Jogo 2 acontece → finalizado → adicionado ao campeonato
Jogo 3 acontece → finalizado → adicionado ao campeonato
↓
Leaderboard do campeonato agrega os 3 jogos
```

**Variante B2 — Campeonato criado depois dos jogos**
```
Jogo 1 acontece (avulso) → finalizado
Jogo 2 acontece (avulso) → finalizado
↓
Organizador decide: "esses dois jogos formam uma série"
↓
Cria championship "Série de Inverno"
Vincula Jogo 1 ao campeonato
Vincula Jogo 2 ao campeonato
↓
Leaderboard gerado retroativamente
```

**Variante B3 — Jogo em múltiplos campeonatos**
```
Jogo 1 pode pertencer a "Campeonato 2025" E a "Melhor de Todos"
↓ (inserção em championship_games para cada um)
Aparece nos leaderboards de ambos
```

---

### Modo C — Participante sem Conta (padrão)

Por padrão, participantes são apenas nomes. O host digita "Raphael", "Ana", "Pedro" — nenhum deles precisa ter conta ou estar presente no momento da criação.

```
Host cria jogo → digita nomes dos participantes
↓
Cada nome vira uma linha em participants com:
  - user_id = null
  - claim_token = <uuid gerado automaticamente>
↓
Jogo acontece, pontos acumulados normalmente
```

---

### Modo D — Participante com Conta

Se um participante já tem conta no sistema, o host pode vinculá-lo diretamente pelo email/nome de usuário. O `user_id` já fica preenchido desde o início.

```
Host cria jogo → busca "Raphael" por conta existente
↓
participants criado com user_id = <uuid da conta>
↓
Histórico do jogo já aparece automaticamente no perfil de Raphael
```

---

### Modo E — Vinculação de Conta Retroativa (Claim)

Um participante que jogou sem conta decide criar uma conta depois e quer recuperar o histórico.

```
Raphael jogou sem conta → tem um claim_token gerado
↓
Raphael cria conta
↓
Recebe o claim_token (via link, QR code ou código)
↓
Sistema faz: UPDATE participants SET user_id = <novo id> WHERE claim_token = <token>
↓
Histórico de todos os jogos com aquele token passa a aparecer na conta
```

**Regras do claim:**
- Um `claim_token` só pode ser usado uma vez.
- Após o uso, o token é invalidado (`claim_token = null`).
- Um participante já vinculado (`user_id` preenchido) não pode ser reivindicado novamente.
- O token não expira por padrão — pode ser usado semanas ou meses depois.

---

## 4. Regras de Negócio do Módulo Online

### 4.1 Criação de Jogo

- Todo jogo recebe um `join_code` único gerado automaticamente (código curto, alfanumérico, ex: `ALFA7`).
- O host pode ter conta ou não. Se não tiver, `host_user_id` fica `null`.
- Um jogo começa com status `lobby`, muda para `active` ao iniciar, e `finished` ao encerrar.
- Um jogo `finished` não pode ser reaberto (seus dados são imutáveis).

### 4.2 Participantes

- Participantes são adicionados pelo host antes ou durante o jogo.
- Um participante pode ser do tipo `host`, `assistant` ou `player`.
- Apenas `players` entram na contagem de pontuação individual.
- Um `player` pertence a exatamente um `team` por jogo.
- O mesmo nome pode aparecer em múltiplos jogos como entradas separadas — é o `user_id` que une o histórico entre jogos, não o nome.

### 4.3 Times

- Times existem apenas dentro de um jogo — não são reutilizados entre jogos.
- Se os mesmos grupos de pessoas jogam sempre juntas, o host recria os times em cada jogo (com os mesmos nomes, se quiser).
- O `final_score` de um time é a soma dos pontos conquistados no jogo, atualizado em tempo real.

### 4.4 Campeonatos

- Campeonatos não têm data de início, fim, ou número mínimo/máximo de jogos.
- Um campeonato pode ter zero jogos (recém-criado, aguardando).
- Um jogo pode estar em zero, um ou vários campeonatos.
- Adicionar ou remover um jogo de um campeonato não altera os dados do jogo em si.
- O leaderboard de um campeonato é sempre calculado sob demanda (não fica armazenado), garantindo que reflita o estado atual dos dados.

### 4.5 Pontuação e Respostas

- Cada resposta registrada cria uma entrada imutável em `answers`.
- A pontuação de um participante e de um time é atualizada incrementalmente a cada resposta.
- Se houver divergência entre `answers` e `final_score`, o `answers` é a fonte da verdade (permite recalcular).
- Modos de pontuação da mímica (`mimica_mode`) são registrados em `answers` para auditoria completa.

### 4.6 Finalização de um Jogo

Ao finalizar, o sistema deve:
1. Calcular o time vencedor (maior `final_score`).
2. Calcular o MVP (participante com maior `final_score` individual).
3. Gravar `winner_team_id` e `mvp_participant_id` em `games`.
4. Mudar `status` para `finished` e gravar `finished_at`.

Esses valores ficam desnormalizados em `games` para facilitar queries de leaderboard sem precisar recalcular.

---

## 5. O que o Sistema Não Faz (por design)

- **Não força um fluxo único:** qualquer entidade pode ser criada em qualquer ordem.
- **Não deleta dados de jogos finalizados:** histórico é permanente.
- **Não requer login:** todas as funcionalidades principais funcionam sem conta.
- **Não limita o número de jogos por campeonato:** nem mínimo, nem máximo.
- **Não define o que é uma "temporada" ou "série":** isso é decisão do organizador — o sistema só oferece a ferramenta (championships) para modelar como quiser.
