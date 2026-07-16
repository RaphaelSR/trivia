# Trivia

Jogo web de trivia cinematografica com modos `demo`, `offline` e `online`.

## Setup
```bash
npm install
npm run dev
```

## Scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
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
- O modo `demo` pode simular sessao pequena, media ou grande sem precisar montar tudo manualmente.
- Modo `offline` persiste sessoes localmente.
- Modo `online` mantém o jogo local-first e já sincroniza sessão, snapshots e histórico com Supabase quando o host entra na conta.
- Em sessões online autenticadas, um QR permanente permite que jogadores reivindiquem seus nomes sem interferir no fluxo do jogo.
- A interface esta em migracao para uma experiencia `dark glassmorphism` mais proxima de dashboard jogavel.

## Workspace local
- A raiz do repositorio pode ser aberta diretamente como vault no Obsidian.
- `.obsidian/` e `docs/obsidian/` permanecem locais para configuracao, board e handoffs temporarios.
- Conhecimento duravel e seguro deve ser migrado para a documentacao oficial em `docs/`.
