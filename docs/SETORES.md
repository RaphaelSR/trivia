# Setores do Projeto

Mapa enxuto para navegar pelo produto sem depender de notas operacionais ou contexto pessoal.

## Entrada e modos

- Rotas: `/` e `/control?mode=demo|offline|online`.
- `demo` prepara uma sessão pronta; `offline` persiste localmente; `online` acrescenta conta e sincronização sem bloquear o jogo local.
- Fonte principal: [REGRAS-DE-NEGOCIO.md](./REGRAS-DE-NEGOCIO.md).

## Jogo, times e turnos

- Domínio: `src/modules/game/domain`.
- Composição: `src/modules/game/application` e provider legado em `src/modules/trivia`.
- Regra central: alternância entre times sempre que possível; times menores repetem integrantes antes de times maiores completarem uma rodada.
- Alterações de elenco preservam o turno e o passado, reconciliando somente o futuro.
- Exemplo de referência `1/2/3`: `A1 -> B1 -> C1 -> A1 -> B2 -> C2 -> A1 -> B1 -> C3`.

## Trivia

- O board contém filmes, perguntas e estados `available`, `active` e `answered`.
- Cada resposta registra pontuação e avança o cursor do trivia.
- A quantidade de perguntas limita quantos turnos futuros realmente acontecerão.

## Mimica

- Usa os mesmos times e a mesma alternância balanceada do trivia.
- Tem cursor próprio e não depende da quantidade de perguntas.
- Ao abrir, o host escolhe entre continuar do trivia ou começar do primeiro.
- Modos opcionais: alternada, aleatória e por time.
- Pontuação fica em `mimicaScores` e no log de eventos.

## Controle e preview

- Dashboard: `src/modules/control/pages/ControlDashboard.tsx`.
- Estado de UI: `src/modules/control/state` e hooks em `src/modules/control/hooks`.
- O preview operacional mostra a sequência realmente salva, o turno atual e permite reorganizar apenas os próximos turnos.

## Conteudo e biblioteca

- Biblioteca gerencia filmes, perguntas, pontos, importação e edição.
- A ordem visual dos filmes é preservada; reimportar um filme existente atualiza seu conteúdo em vez de duplicá-lo.
- Persistência nunca deve acessar `localStorage` diretamente a partir da UI.

## Sessao, historico e sync

- Repositórios: `src/modules/game/infrastructure`.
- Serviços compartilhados: `src/shared/services`.
- O jogo é local-first; sincronização em nuvem é assíncrona e não pode bloquear uma jogada.
- Checkpoints preservam pontos de retorno antes de jogadas e ações destrutivas.

## Conta e online

- Autenticação e histórico: `src/modules/auth`.
- Backend oficial: Supabase com RLS e PII mínima.
- Detalhes: [online/README.md](./online/README.md).

## Interface e temas

- Temas válidos: `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil` e `easter`.
- Default: `light`.
- Tokens e aplicação: `src/app/providers` e `src/shared/constants/theme.ts`.

## Documentacao e Obsidian

- A raiz do repositório funciona como vault Obsidian.
- Fontes oficiais: `AGENTS.md`, `docs/REGRAS-DE-NEGOCIO.md`, `docs/ARQUITETURA.md`, `docs/PLANO-REFATORACAO.md` e `docs/FUNCIONALIDADES.md`.
- `.obsidian/` e `docs/obsidian/` guardam apenas estado e operação local; não devem conter credenciais nem substituir as fontes oficiais.
