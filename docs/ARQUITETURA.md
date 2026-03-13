# Arquitetura

## Stack
- React 19
- TypeScript strict
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Firebase SDK
- Jest + Testing Library

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

## Online/Firebase
- A arquitetura já separa o modo `online` em repository próprio.
- Enquanto a sincronização remota completa não estiver ativa, o adapter online deve permanecer isolado atrás de interface e com namespace dedicado.
- O fluxo de UI não deve afirmar que o modo online está “fake”; ele deve refletir a capacidade real do adapter atual.
