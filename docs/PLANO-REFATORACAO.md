# Plano de Refatoracao

## Ordem de execucao
1. Consolidar documentacao.
2. Extrair contratos e constantes compartilhadas.
3. Mover persistencia para services e repositories.
4. Extrair dominio puro do jogo.
5. Afinar provider e hooks de aplicacao.
6. Refatorar dashboard com reducer e subcomponentes.
7. Remover codigo morto e fluxos enganosos.
8. Aplicar redesign dark glassmorphism.

## Entregas desta rodada
- `AGENTS.md` criado como porta de entrada para agents.
- `docs/` consolidado com regras, arquitetura e plano.
- `shared/` e `modules/game/` iniciados como base da nova arquitetura.
- Hardcodes de modo, storage, tema e PIN migrados para constantes.
- Persistencia local migrada para service/repositories.
- Provider e hooks começam a consumir contratos novos sem quebrar a API publica.

## Proximas frentes
- Reduzir `ControlDashboard.tsx` com `useReducer`.
- Mover componentes de dominio de `components/ui` para modulos adequados.
- Completar redesign do dashboard principal.
- Expandir cobertura de testes para todas as regras nomeadas em `REGRAS-DE-NEGOCIO.md`.
