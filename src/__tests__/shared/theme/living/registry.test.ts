import {
  getLivingSceneDefinition,
  isFullLivingTheme,
  isLivingTheme,
  LIVING_SCENE_REGISTRY,
} from '@/shared/theme/living/registry'
import {
  CURRENT_LIVING_THEME_IDS,
  LIVING_THEME_IDS,
  NEW_LIVING_THEME_IDS,
  type LivingSceneViewport,
} from '@/shared/theme/living/types'
import { seededRandom } from '@/shared/theme/living/core'

describe('living scene registry', () => {
  it('mantém todos os IDs únicos e registrados', () => {
    expect(new Set(LIVING_THEME_IDS).size).toBe(LIVING_THEME_IDS.length)
    expect(Object.keys(LIVING_SCENE_REGISTRY).sort()).toEqual(
      [...LIVING_THEME_IDS].sort(),
    )
    expect(NEW_LIVING_THEME_IDS).toHaveLength(9)
  })

  it.each(LIVING_THEME_IDS)('resolve a definição de %s', (theme) => {
    expect(isLivingTheme(theme)).toBe(true)
    expect(getLivingSceneDefinition(theme)).toBe(LIVING_SCENE_REGISTRY[theme])
    expect(LIVING_SCENE_REGISTRY[theme].loadRenderer).toEqual(
      expect.any(Function),
    )
  })

  it.each(LIVING_THEME_IDS)(
    'carrega e exercita o renderer real de %s',
    async (theme) => {
      const registration = LIVING_SCENE_REGISTRY[theme]
      const renderer = await registration.loadRenderer()
      const initialViewport: LivingSceneViewport = {
        width: 480,
        height: 270,
        dpr: 1,
        density: 0.58,
      }
      const resizedViewport: LivingSceneViewport = {
        width: 375,
        height: 812,
        dpr: 1.25,
        density: 0.58,
      }
      const scene = renderer.create({
        viewport: initialViewport,
        seed: registration.seed,
        random: seededRandom(registration.seed),
      })

      expect(() => {
        scene.resize(resizedViewport)
        scene.update(1 / 30)
        scene.render(createCanvasContextMock(), resizedViewport, 1 / 30)
        scene.dispose?.()
      }).not.toThrow()
    },
  )

  it('rejeita temas fora do motor vivo', () => {
    expect(isLivingTheme('light')).toBe(false)
    expect(getLivingSceneDefinition('light')).toBeUndefined()
  })

  it('preserva as quatro cenas legadas de overlay e trata as demais como completas', () => {
    expect(
      CURRENT_LIVING_THEME_IDS.filter((theme) => !isFullLivingTheme(theme)),
    ).toEqual(['world-cup-2026', 'kawaii', 'neon-city', 'storybook'])
    NEW_LIVING_THEME_IDS.forEach((theme) =>
      expect(isFullLivingTheme(theme)).toBe(true),
    )
  })
})

function createCanvasContextMock() {
  const gradient = { addColorStop: jest.fn() }
  const methodNames = [
    'arc',
    'beginPath',
    'bezierCurveTo',
    'clip',
    'closePath',
    'ellipse',
    'fill',
    'fillRect',
    'lineTo',
    'moveTo',
    'quadraticCurveTo',
    'rect',
    'restore',
    'rotate',
    'save',
    'scale',
    'setLineDash',
    'stroke',
    'strokeRect',
    'translate',
  ] as const
  const context = Object.fromEntries(
    methodNames.map((methodName) => [methodName, jest.fn()]),
  ) as Record<string, unknown>
  context.createLinearGradient = jest.fn(() => gradient)
  context.createRadialGradient = jest.fn(() => gradient)
  return context as unknown as CanvasRenderingContext2D
}
