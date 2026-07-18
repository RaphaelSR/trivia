# AGENTS

## Produto
- Trivia web para noites de cinema com três modos: `demo`, `offline` e `online`.
- Fluxo principal: `/` -> seleção de modo -> `/control?mode=...`.
- Prioridades do projeto: regras de negócio confiáveis, arquitetura simples, UI moderna estilo dashboard jogável.

## Fonte de Verdade
1. `docs/REGRAS-DE-NEGOCIO.md`
2. `docs/ARQUITETURA.md`
3. `docs/PLANO-REFATORACAO.md`
4. `docs/FUNCIONALIDADES.md`
5. `README.md`

## Como Trabalhar
- Preserve as regras de negócio antes de mexer em layout.
- Prefira extrair lógica pura para `src/modules/game/domain`.
- Toda persistência deve passar por `src/shared/services` ou `src/modules/game/infrastructure`.
- Evite novos acessos diretos a `localStorage`.
- Mantenha compatibilidade com a API pública de `useTriviaSession` enquanto a UI estiver sendo migrada.
- A raiz do repositorio pode ser usada como vault Obsidian. Trate `.obsidian/` e `docs/obsidian/` como workspace local e migre conhecimento duravel, sem dados sensiveis, para a documentacao oficial em `docs/`.
- Só criar commits depois de validação explícita do usuário.

## Regras Essenciais
- `GameMode`: `demo | offline | online`
- `ThemeMode`: `light | dark | cinema | retro | matrix | brazil | easter | world-cup-2026 | kawaii | neon-city | storybook | web-city | deep-space | midnight-cinema | underwater | neon-grand-prix | pixel-bomb-arena | shadow-dojo | wasteland-rooftops | enchanted-kingdom | starfighter-battle | moonlit-liner | castaway-island | family-noir`
- `TileState`: `available | active | answered`
- `MimicaScoringMode`: `full-current | half-current | steal | everyone | void`
- Jogo termina quando todas as tiles estão `answered`.
- Sequência de turnos deve evitar times consecutivos quando possível.
- PIN padrão é controlado por constante compartilhada, nunca hardcoded em UI.

## Estrutura Atual-Alvo
```text
src/
  app/
  shared/
    components/
    constants/
    services/
    theme/
    types/
    utils/
  modules/
    landing/
    game/
      domain/
      application/
      infrastructure/
      ui/
    control/
      application/
      state/
      ui/
```

## Limites
- Não inventar docs extras fora de `docs/` nesta primeira rodada.
- Não reintroduzir rota `/display`.
- Não deixar credenciais ou senhas hardcoded em componentes.
