# Trivia

Jogo web de trivia cinematográfica para noites de cinema. A interface oferece dois estilos: `Demo` e `Partida completa`. Conta e sincronização são recursos opcionais da partida completa, não um modo de jogo separado.

## Setup
```bash
npm install
npm run dev
```

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run i18n:check`
- `npm run test`
- `npm run test:coverage`

## Documentacao
- [AGENTS.md](./AGENTS.md)
- [docs/README.md](./docs/README.md)
- [docs/REGRAS-DE-NEGOCIO.md](./docs/REGRAS-DE-NEGOCIO.md)
- [docs/ARQUITETURA.md](./docs/ARQUITETURA.md)
- [docs/PLANO-REFATORACAO.md](./docs/PLANO-REFATORACAO.md)
- [docs/FUNCIONALIDADES.md](./docs/FUNCIONALIDADES.md)

## Status real
- Fluxo principal ativo em `/` e `/control?mode=...`.
- `Demo` simula partidas pequenas, médias ou grandes com dados prontos e não salva progresso.
- `Partida completa` inicia a configuração real e salva automaticamente neste navegador.
- Entrar em uma conta acrescenta sincronização, restauração entre dispositivos, histórico, QR de reivindicação e avatares sem mudar as regras da partida.
- Ao voltar ao jogo, o host escolhe qual sessão abrir ou inicia uma nova; versões local/nuvem da mesma sessão são comparadas sem permitir que uma partida diferente sobrescreva a atual.
- Os valores internos `demo | offline | online` continuam aceitos para compatibilidade de rotas e sessões antigas; eles não definem sozinhos se a conta está conectada.
- Contas podem usar avatar opcional, exibido somente entre participantes de uma sessão ou partida compartilhada; o nome continua específico de cada jogo.
- A interface usa catálogos i18n em `src/shared/i18n`; português do Brasil é o idioma ativo e espanhol/inglês podem ser adicionados sem espalhar texto pelos componentes.

## Workspace local
- A raiz do repositorio pode ser aberta diretamente como vault no Obsidian.
- `.obsidian/` e `docs/obsidian/` permanecem locais para configuracao, board e handoffs temporarios.
- Conhecimento duravel e seguro deve ser migrado para a documentacao oficial em `docs/`.
