# Online: Arquitetura e Banco

## Fronteira local-first

`TriviaSession` continua sendo o estado operacional do jogo. O host salva localmente e `useCloudSync` replica o snapshot para `online_sessions` em background. Falha de rede gera estado pendente, nunca bloqueia uma jogada.

Claims, conta e identidade ficam em serviços/RPCs separados. Eles não alteram pontuação, turnos, mímica ou o formato público de `useTriviaSession`.

## Modelo aplicado

As migrations em `supabase/migrations/` são incrementais:

- `0001`–`0002`: `profiles`, histórico inicial e `online_sessions`;
- `0003`–`0004`: histórico normalizado e criação transacional;
- `0005`–`0007`: vínculo por e-mail, links de claim e contatos do próprio host;
- `0008`: snapshots remotos de restauração;
- `0009`: convite ao vivo, ledger `participant_claims` e finalização idempotente;
- `0010`: avatar de perfil, bucket com escrita owner-only e leituras contextuais de identidade.

O histórico normalizado usa `games`, `game_teams`, `game_participants`, `game_films`, `game_questions`, `score_events`, `score_event_recipients` e `game_raw_snapshots`. O snapshot integral é preservado para reprocessamento; listagens usam tabelas normalizadas.

## Idempotencia de finalizacao

`create_game_normalized(jsonb)` permanece intacta para importações e consumidores antigos. Partidas ao vivo chamam a RPC aditiva:

```text
create_game_normalized_idempotent(payload, TriviaSession.id)
```

Garantias:

1. `(owner_user_id, source_session_id)` é único quando `source_session_id` existe.
2. Um advisory lock transacional serializa duas finalizações da mesma conta+sessão.
3. Dentro do lock, a função procura o jogo existente antes de criar.
4. Repetir ou concorrer devolve o mesmo `game_id`.
5. Qualquer falha reverte criação, cópia de claims e associação do token na mesma transação.

Partidas completas novas recebem um `TriviaSession.id` opaco e exclusivo já na criação. O ID fixo `empty-session`, emitido por versões antigas, é reconhecido somente na restauração de partidas completas e substituído por uma identidade determinística baseada na data original da sessão. Assim, local e nuvem convergem para a mesma chave no primeiro carregamento, sem reescrever jogos já normalizados nem confundir duas partidas futuras na restrição idempotente.

Não há backfill amplo e `online_sessions` não é arquivada pela migration `0009`; isso preserva o fluxo de restauração já usado por partidas reais. Uma evolução de arquivamento exige auditoria de dados separada.

## Token permanente e rotação

`online_sessions.join_token` pertence a `invite_session_id`, que é o `TriviaSession.id`. A linha de backup pode ser reaproveitada pela próxima partida, mas o token é rotacionado antes de representar a nova sessão. O token anterior já copiado para `games.join_token` continua funcionando no histórico.

A rotação depende de a nova partida possuir outro `TriviaSession.id`; por isso a identidade da sessão é uma regra de persistência, não um detalhe de interface. O upgrade do antigo ID fixo faz a próxima abertura/sincronização girar o token automaticamente, sem migration destrutiva no banco.

Durante o jogo, `/claim?session=` resolve o snapshot ativo. Depois do fim, o mesmo token resolve o jogo normalizado. Links antigos `/claim?token=` e `/claim?game=` não mudaram.

## Concorrencia de claims

`participant_claims` preserva claims ativos e revogados. Índices parciais únicos garantem:

- um claim ativo por slot em cada sessão/jogo;
- um slot ativo por conta em cada sessão/jogo.

As RPCs bloqueiam a linha da sessão ou do jogo antes de conferir e gravar. Repetir o próprio claim do mesmo slot é sucesso idempotente; duas contas disputando o mesmo slot produzem um vencedor e `SLOT_UNAVAILABLE` para a outra.

## RLS e privilégios

- tabelas de sessão e convites são owner-only;
- participantes veem apenas jogos aos quais estão vinculados;
- `participant_claims` permite leitura do próprio claim ou pelo host;
- escrita direta no ledger é revogada; mutações passam por RPC autenticada;
- funções privilegiadas usam `search_path` vazio e referências de schema explícitas;
- e-mails de convite ficam em `participant_invites` e nunca aparecem nas listas de claim.

## Avatar e identidade contextual

`profiles.avatar_path` guarda somente o caminho opaco no bucket público `profile-avatars`. O conteúdo público é uma foto de perfil deliberadamente compartilhável por URL; upload, update e delete permanecem protegidos por RLS na pasta do dono.

`get_my_profile_identity()` retorna o próprio perfil. `list_live_participant_identities(session_id)` é host-only e retorna apenas claims ativos daquela sessão. `list_game_participant_identities(game_id)` limita a leitura ao dono e a participantes vinculados ao mesmo jogo. Nenhuma dessas identidades entra em `TriviaSession`, snapshots ou cursores.
