import {
  PIXEL_BOMB_ARENA_SPAWN_CELLS,
  isPixelBombArenaPillar,
} from '@/shared/theme/living/scenes/pixel-bomb-arena'

describe('pixel bomb arena', () => {
  it('mantem todos os pontos iniciais fora dos pilares fixos', () => {
    expect(
      PIXEL_BOMB_ARENA_SPAWN_CELLS.every(
        (cell) => !isPixelBombArenaPillar(cell),
      ),
    ).toBe(true)
  })
})
