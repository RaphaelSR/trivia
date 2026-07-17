# Arquitetura

## Stack
- React 19
- TypeScript strict
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Jest + Testing Library

## Documentacao oficial
- `docs/README.md`: indice geral da documentacao do projeto.
- `docs/FUNCIONALIDADES.md`: mapa funcional do que esta ativo, interno e planejado.
- `docs/SETORES.md`: mapa enxuto das responsabilidades e regras de cada setor do produto.
- `docs/online/`: arquitetura, segurança e operação da conta e dos recursos conectados (nome legado do diretório).
- A raiz do repositorio pode ser aberta como vault no Obsidian. `.obsidian/` e `docs/obsidian/` continuam locais; conhecimento duravel deve ser migrado para os documentos oficiais antes de entrar no Git.

## Mapa atual
- `src/app`: bootstrap, providers e rotas.
- `src/modules/trivia`: provider/contexto legado do jogo.
- `src/modules/control`: dashboard operacional do host.
- `src/components/ui`: mistura componentes genéricos e específicos de domínio.
- `src/shared`: nova base para contratos, storage, utilitários e componentes reutilizáveis.
- `src/modules/game`: nova casa para domínio puro, infraestrutura e hooks de aplicação.
- `src/shared/i18n`: bootstrap, tipagem e catálogos de texto da interface.

## Hotspots reais
- `src/modules/control/pages/ControlDashboard.tsx`: componente grande com múltiplas responsabilidades de UI, persistência e regras.
- `src/modules/trivia/providers/TriviaSessionProvider.tsx`: provider legado com inicialização, turnos, scoring e mutações do board.
- `src/hooks/useOfflineSession.ts`: persistência local acoplada à UI.
- `src/styles/globals.css`: tokens e estilos globais ainda concentrados em um único arquivo.

## Diretrizes
- Regra de negócio vai para `src/modules/game/domain`.
- Acesso a browser storage vai para `src/shared/services/storage.service.ts`.
- Persistência por modo vai para repositories em `src/modules/game/infrastructure`.
- Hooks de composição do jogo vão para `src/modules/game/application`.
- Componentes genéricos ficam em `src/shared/components`; componentes de fluxo ficam nos módulos.

## Motor de turnos
- `src/modules/game/domain/turn-order.ts` concentra a ordem do trivia, preview e avanço do cursor da sessão.
- `src/modules/game/domain/mimica-turn-order.ts` deriva a ordem da mímica reutilizando a alternância balanceada, mas sem depender do total de perguntas.
- `src/modules/game/domain/team-draw.ts` define o gate de pré-jogo e a distribuição aleatória balanceada; ele não altera sessão, pontuação ou cursor.
- A composição de times e participantes é compartilhada; os cursores de trivia e mímica são independentes.
- `rebuildSessionTurnState` preserva o prefixo já jogado e reconcilia somente o futuro quando o elenco muda ou o host reorganiza a ordem.
- O preview operacional deve consumir `session.turnSequence`; estimativas só são usadas antes de existir uma sequência real.

## Estilo de partida e capacidade conectada

- A interface apresenta `Demo` e `Partida completa`.
- `GameMode` continua com `demo | offline | online` para compatibilidade de URLs, repositórios e sessões persistidas.
- A disponibilidade de recursos de conta é derivada separadamente: usuário autenticado + Supabase configurado + partida não demo.
- Portanto, o valor interno `offline` não significa “sem internet”; uma partida completa autenticada sincroniza e usa recursos de identidade normalmente.
- `demo` é a única fronteira rígida: não salva, não sincroniza e não chama serviços de claim/avatar.

## Conta e Supabase
- O jogo é local-first; `useCloudSync` replica snapshots no Supabase e preserva mudanças pendentes em falhas.
- Histórico normalizado e claims passam por serviços em `src/modules/auth/services` e Database Functions transacionais.
- Conta, claim e avatar ficam fora de `TriviaSession` e do domínio de pontuação/turnos.
- Partidas ao vivo finalizam por uma RPC aditiva idempotente; importações e RPCs históricas mantêm seus contratos.
- QR é gerado localmente por `src/shared/components/LocalQrCode.tsx`.
- Avatares passam por `src/modules/auth/services/profile-avatar.service.ts`: a pessoa ajusta enquadramento e zoom no navegador; o canvas gera WebP 512×512 com alvo de 350 KB e limite rígido de 1 MB. O Storage guarda somente `uid/uuid.webp` — nunca base64 no banco — e RPCs retornam identidade apenas para sessões/jogos compartilhados.
- A UI usa `ParticipantAvatar` com fallback local por iniciais; somente `demo` não aciona serviços de identidade. Partidas completas deslogadas também permanecem totalmente locais.
- Detalhes: [`docs/online/ARQUITETURA-ONLINE.md`](./online/ARQUITETURA-ONLINE.md).

## Internacionalização

- `src/shared/i18n/i18n.ts` inicializa `i18next` e `react-i18next`, aplica o idioma no elemento `<html>` e persiste a preferência pelo `storageService`.
- Os catálogos são divididos nos namespaces `common`, `landing`, `control`, `auth` e `game` em `src/shared/i18n/locales/<locale>`.
- Português do Brasil (`pt-BR`) é o idioma padrão e fallback. Espanhol e inglês ainda não estão publicados.
- Componentes e mensagens de serviço não mantêm texto de interface literal. `npm run i18n:check` fiscaliza JSX, atributos acessíveis, toasts, confirmações e retornos de importação em `.ts`/`.tsx`.
- Regras de domínio retornam dados neutros; a camada de apresentação transforma esses dados em frases traduzidas. Conteúdo criado pelo usuário e nomes de filmes/perguntas não são traduzidos.
- Para adicionar um idioma: criar os cinco catálogos, registrá-lo em `resources.ts`, traduzir exemplos de importação e executar `i18n:check`, testes, lint e build.
