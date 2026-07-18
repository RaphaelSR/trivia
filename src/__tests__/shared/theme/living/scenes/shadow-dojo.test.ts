import { seededRandom } from '@/shared/theme/living/core'
import { shadowDojoRenderer } from '@/shared/theme/living/scenes/shadow-dojo'
import type { LivingSceneAudioEvent } from '@/shared/theme/living/types'

describe('shadow dojo', () => {
  it('emite somente um impacto por troca, inclusive quando o defensor salta', () => {
    const events: Array<LivingSceneAudioEvent & { step: number }> = []
    let step = 0
    const scene = shadowDojoRenderer.create({
      viewport: { width: 1280, height: 720, dpr: 1, density: 1 },
      seed: 1992,
      random: seededRandom(1992),
      emitAudioEvent: (event) => events.push({ ...event, step }),
    })

    for (step = 0; step < 1200; step += 1) scene.update(1 / 30)

    const impactsByStep = new Map<number, number>()
    events
      .filter((event) => event.cue === 'impact')
      .forEach((event) => {
        impactsByStep.set(event.step, (impactsByStep.get(event.step) ?? 0) + 1)
      })

    expect(events.some((event) => event.cue === 'combat-strike')).toBe(true)
    expect(impactsByStep.size).toBeGreaterThan(0)
    expect(Math.max(...impactsByStep.values())).toBe(1)
  })
})
