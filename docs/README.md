# Documentacao do Projeto

Central de navegacao dos documentos oficiais do `trivia`.

## Fonte de verdade principal
- [../AGENTS.md](../AGENTS.md): contexto rapido para agents e limites de trabalho no repositorio
- [REGRAS-DE-NEGOCIO.md](./REGRAS-DE-NEGOCIO.md): regras funcionais que nao devem ser quebradas
- [ARQUITETURA.md](./ARQUITETURA.md): estrutura atual, hotspots e diretrizes tecnicas
- [PLANO-REFATORACAO.md](./PLANO-REFATORACAO.md): ordem de execucao e proximas frentes

## Produto e estado atual
- [FUNCIONALIDADES.md](./FUNCIONALIDADES.md): inventario das funcionalidades implementadas, internas e planejadas

## Modulo online
- [online/README.md](./online/README.md): indice dos documentos do modo `online`
- [online/ARQUITETURA-ONLINE.md](./online/ARQUITETURA-ONLINE.md): schema, persistencia e estrategia de modelagem
- [online/MODOS-DE-USO.md](./online/MODOS-DE-USO.md): cenarios de uso e regras do modulo
- [online/AUTENTICACAO.md](./online/AUTENTICACAO.md): desenho de login e vinculacao de conta
- [online/AMBIENTE-E-DEPLOY.md](./online/AMBIENTE-E-DEPLOY.md): ambiente, deploy e operacao
- [online/INFRAESTRUTURA-E-CUSTOS.md](./online/INFRAESTRUTURA-E-CUSTOS.md): decisoes de stack e impacto operacional

## O que entra no Git
- Tudo dentro de `docs/` que descreve produto, regras, arquitetura, roadmap e planejamento tecnico.
- `docs/online/` faz parte da documentacao oficial, mesmo quando estiver em status de planejamento.

## O que nao entra no Git
- `.obsidian/`: configuracao local do app Obsidian.
- `docs/obsidian/`: workspace operacional pessoal para notas, board e handoff.

## Convencoes desta pasta
- Prefira atualizar um doc existente antes de criar outro.
- Regra funcional vai primeiro para `REGRAS-DE-NEGOCIO.md`.
- Mudanca estrutural vai primeiro para `ARQUITETURA.md`.
- Mudanca de prioridade vai para `PLANO-REFATORACAO.md`.
- Documentos de apoio devem apontar de volta para essas fontes centrais.
