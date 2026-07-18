import {
  PIXEL_BOMB_ARENA_SPAWN_CELLS,
  isPixelBombArenaPillar,
  pixelBombArenaRenderer,
} from '@/shared/theme/living/scenes/pixel-bomb-arena'

describe('pixel bomb arena', () => {
  it('mantem todos os pontos iniciais fora dos pilares fixos', () => {
    expect(
      PIXEL_BOMB_ARENA_SPAWN_CELLS.every(
        (cell) => !isPixelBombArenaPillar(cell),
      ),
    ).toBe(true)
  })

  it('emite colocação e explosão somente durante as transições de update', () => {
    const emitAudioEvent = jest.fn()
    const scene = pixelBombArenaRenderer.create({
      viewport: { width: 1280, height: 720, dpr: 1, density: 1 },
      seed: 1993,
      random: () => 0.5,
      emitAudioEvent,
    })
    const gradient = { addColorStop: jest.fn() }
    const context = new Proxy({
      createLinearGradient: jest.fn(() => gradient),
      createRadialGradient: jest.fn(() => gradient),
    } as Record<string, unknown>, {
      get(target, property) {
        if (!(property in target)) target[property as string] = jest.fn()
        return target[property as string]
      },
    }) as unknown as CanvasRenderingContext2D

    scene.render(context, { width: 1280, height: 720, dpr: 1, density: 1 }, 0)
    expect(emitAudioEvent).not.toHaveBeenCalled()

    for (let step = 0; step < 240; step += 1) scene.update(1 / 30)

    expect(emitAudioEvent).toHaveBeenCalledWith(expect.objectContaining({ cue: 'bomb-place' }))
    expect(emitAudioEvent).toHaveBeenCalledWith(expect.objectContaining({ cue: 'explosion' }))
  })
})
