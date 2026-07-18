import { enchantedKingdomRenderer } from '@/shared/theme/living/scenes/enchanted-kingdom'
import type { LivingSceneAudioEvent } from '@/shared/theme/living/types'

describe('enchanted kingdom', () => {
  it('toca o flyby quando o cometa entra na tela, não quando nasce fora dela', () => {
    const events: Array<LivingSceneAudioEvent & { step: number }> = []
    let step = 0
    const scene = enchantedKingdomRenderer.create({
      viewport: { width: 1280, height: 720, dpr: 1, density: 1 },
      seed: 1995,
      random: () => 0,
      emitAudioEvent: (event) => events.push({ ...event, step }),
    })

    for (step = 0; step < 195; step += 1) scene.update(1 / 30)
    expect(events.filter((event) => event.cue === 'flyby')).toHaveLength(0)

    for (; step < 225; step += 1) scene.update(1 / 30)
    const flybys = events.filter((event) => event.cue === 'flyby')

    expect(flybys).toHaveLength(1)
    expect(flybys[0].step).toBeGreaterThanOrEqual(205)
    expect(flybys[0].step).toBeLessThanOrEqual(212)
  })
})
