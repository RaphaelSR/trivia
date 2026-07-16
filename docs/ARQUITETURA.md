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
- `docs/online/`: planejamento detalhado do modo `online`.
- A raiz do repositorio pode ser aberta como vault no Obsidian. `.obsidian/` e `docs/obsidian/` continuam locais; conhecimento duravel deve ser migrado para os documentos oficiais antes de entrar no Git.

## Mapa atual
- `src/app`: bootstrap, providers e rotas.
- `src/modules/trivia`: provider/contexto legado do jogo.
- `src/modules/control`: dashboard operacional do host.
- `src/components/ui`: mistura componentes genéricos e específicos de domínio.
- `src/shared`: nova base para contratos, storage, utilitários e componentes reutilizáveis.
- `src/modules/game`: nova casa para domínio puro, infraestrutura e hooks de aplicação.

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
- A composição de times e participantes é compartilhada; os cursores de trivia e mímica são independentes.
- `rebuildSessionTurnState` preserva o prefixo já jogado e reconcilia somente o futuro quando o elenco muda ou o host reorganiza a ordem.
- O preview operacional deve consumir `session.turnSequence`; estimativas só são usadas antes de existir uma sequência real.

## Online/Supabase
- A arquitetura já separa o modo `online` em repository próprio.
- Supabase é a decisão oficial para persistência remota, autenticação opcional e realtime.
- Enquanto a sincronização remota completa não estiver ativa, o adapter online permanece como cache local isolado atrás de interface e com namespace dedicado.
- O fluxo de UI não deve afirmar que o modo online está “fake”; ele deve refletir a capacidade real do adapter atual.
- **Planejamento detalhado:** ver [`docs/online/ARQUITETURA-ONLINE.md`](./online/ARQUITETURA-ONLINE.md) — modelagem remota, queries, fluxo de jogo e próximos passos.
