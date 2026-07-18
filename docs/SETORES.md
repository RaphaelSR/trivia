# Setores do Projeto

Mapa enxuto para navegar pelo produto sem depender de notas operacionais ou contexto pessoal.

## Entrada e estilos

- Rotas: `/` e `/control?mode=demo|offline|online`.
- A landing apresenta `Demo` e `Partida completa`; `offline|online` permanecem apenas como compatibilidade interna.
- Conta/sincronização é uma capacidade separada do estilo: partida completa salva localmente e, quando autenticada, também sincroniza.
- Fonte principal: [REGRAS-DE-NEGOCIO.md](./REGRAS-DE-NEGOCIO.md).

## Jogo, times e turnos

- Domínio: `src/modules/game/domain`.
- Composição: `src/modules/game/application` e provider legado em `src/modules/trivia`.
- Regra central: alternância entre times sempre que possível; times menores repetem integrantes antes de times maiores completarem uma rodada.
- Alterações de elenco preservam o turno e o passado, reconciliando somente o futuro.
- Antes de salvar uma alteração real de elenco em partida completa, o estado anterior vira um checkpoint restaurável.
- No pré-jogo, o host pode sortear uma formação balanceada a partir de uma lista única. A ação produz apenas um rascunho revisável e usa o salvamento/checkpoint já existente.
- O sorteio é bloqueado assim que uma pergunta é revelada ou qualquer pontuação/evento é registrado.
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

## Roleta de filmes

- Planeja filmes para uma próxima edição e não consome o board ou a Biblioteca da sessão atual.
- Cada abertura começa com uma lista temporária vazia; os filmes são adicionados na hora e não formam um catálogo persistente.
- A entrada manual é o fluxo principal. O autocomplete Apple/iTunes apenas sugere título e ano após três caracteres.
- Falha, lentidão ou ausência de resultados do autocomplete é ignorada silenciosamente e nunca bloqueia o sorteio.

## Sessao, historico e sync

- Repositórios: `src/modules/game/infrastructure`.
- Serviços compartilhados: `src/shared/services`.
- O jogo é local-first; sincronização em nuvem é assíncrona e não pode bloquear uma jogada.
- Checkpoints preservam pontos de retorno antes de jogadas e ações destrutivas.
- A entrada da partida compara dispositivo e conta antes de ligar o sync. IDs distintos são jogos distintos; conflitos da mesma sessão exigem escolha explícita.
- Começar uma nova partida preserva a anterior, cria novo ID e troca a sessão online ativa por uma única RPC transacional.

## Conta e recursos conectados

- Autenticação e histórico: `src/modules/auth`.
- Backend oficial: Supabase com RLS e PII mínima.
- Convite ao vivo: um QR por partida completa sincronizada, gerado localmente depois de forçar o sync.
- Claims usam IDs estáveis de participantes, índices de unicidade e ledger auditável fora do estado do jogo.
- Finalização ao vivo é idempotente por conta + ID da sessão; as RPCs legadas continuam compatíveis.
- Partidas finalizadas são somente leitura no histórico. `Abrir uma cópia` lê o snapshot integral, exige uma escolha explícita e cria uma nova sessão; nenhuma edição reaproveita o ID ou os vínculos do original.
- Avatares são identidade de conta fora do snapshot: upload owner-only no Storage, leitura contextual por RPC e fallback por iniciais em demo ou sem conta.
- Detalhes: [online/README.md](./online/README.md).

## Interface e temas

- Temas válidos: `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil`, `easter`, `world-cup-2026`, `kawaii`, `neon-city`, `storybook`, `web-city`, `deep-space`, `midnight-cinema`, `underwater`, `neon-grand-prix`, `pixel-bomb-arena`, `shadow-dojo`, `wasteland-rooftops`, `enchanted-kingdom`, `starfighter-battle`, `moonlit-liner`, `castaway-island` e `family-noir`.
- Default: `light`.
- Catálogo: `src/shared/constants/theme.ts`; tokens e aplicação: `src/app/providers`.
- Grupos da galeria: `classic`, `animated`, `game` e `cinema`.
- Seletor compartilhado: `src/shared/components/ThemePicker.tsx`; composição de cenários: `ThemeBackground.tsx`; motor procedural: `LivingThemeCanvas.tsx`.
- Artes dos 13 cenários completos: pares AVIF/WebP locais em `src/assets/themes`, compostos com vinheta e Canvas; nenhum asset externo participa do runtime.
- Cenários ficam atrás das superfícies, não recebem eventos e respeitam movimento reduzido.
- A ação frontal de `web-city` usa SVG local sem eventos; no mobile, o acesso à galeria passa pelo drawer de `ControlSidebar`, que permanece montado fora do corpo desktop.

## Idiomas e conteúdo estático

- Bootstrap e recursos: `src/shared/i18n`.
- Namespaces: `common`, `landing`, `control`, `auth` e `game`.
- `pt-BR` é o fallback atual; espanhol e inglês estão previstos para próximos PRs.
- `npm run i18n:check` impede novos textos de interface literais em `.ts`/`.tsx`.

## Documentacao e Obsidian

- A raiz do repositório funciona como vault Obsidian.
- Fontes oficiais: `AGENTS.md`, `docs/REGRAS-DE-NEGOCIO.md`, `docs/ARQUITETURA.md`, `docs/PLANO-REFATORACAO.md` e `docs/FUNCIONALIDADES.md`.
- `.obsidian/` e `docs/obsidian/` guardam apenas estado e operação local; não devem conter credenciais nem substituir as fontes oficiais.
