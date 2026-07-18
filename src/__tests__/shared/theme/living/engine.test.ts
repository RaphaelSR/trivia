import {
  createLivingSceneViewport,
  LIVING_SCENE_FIXED_STEP_SECONDS,
  LIVING_SCENE_MAX_DPR,
  LIVING_SCENE_MAX_PIXELS,
  mountLivingScene,
} from '@/shared/theme/living/engine'
import type { LivingSceneDefinition } from '@/shared/theme/living/types'

describe('living scene engine', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalMatchMedia = window.matchMedia
  const originalRequestAnimationFrame = window.requestAnimationFrame
  const originalCancelAnimationFrame = window.cancelAnimationFrame

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    window.matchMedia = originalMatchMedia
    window.requestAnimationFrame = originalRequestAnimationFrame
    window.cancelAnimationFrame = originalCancelAnimationFrame
    jest.restoreAllMocks()
  })

  it('limita DPR e o total de pixels do backing store', () => {
    const regular = createLivingSceneViewport(1280, 720, 3)
    const fourK = createLivingSceneViewport(3840, 2160, 2)

    expect(regular.dpr).toBe(LIVING_SCENE_MAX_DPR)
    expect(fourK.width * fourK.height * fourK.dpr ** 2).toBeLessThanOrEqual(
      LIVING_SCENE_MAX_PIXELS + 0.001,
    )
  })

  it('avança com passo fixo, limita deltas grandes e preserva a instância no resize', () => {
    let scheduledFrame: FrameRequestCallback | undefined
    let frameId = 0
    const render = jest.fn()
    const update = jest.fn()
    const resize = jest.fn()
    const dispose = jest.fn()
    const create = jest.fn(() => ({ render, update, resize, dispose }))
    const definition: LivingSceneDefinition = {
      seed: 17,
      layer: 'full',
      renderer: { create },
    }
    const context = {
      clearRect: jest.fn(),
      setTransform: jest.fn(),
    } as unknown as CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => context,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = createMatchMedia(false)
    window.requestAnimationFrame = jest.fn((callback) => {
      scheduledFrame = callback
      frameId += 1
      return frameId
    })
    window.cancelAnimationFrame = jest.fn()

    const canvas = document.createElement('canvas')
    const unmount = mountLivingScene(canvas, definition)

    expect(create).toHaveBeenCalledTimes(1)
    expect(resize).toHaveBeenCalledTimes(1)

    scheduledFrame?.(0)
    scheduledFrame?.(1000)

    expect(update).toHaveBeenCalledTimes(3)
    expect(update).toHaveBeenCalledWith(LIVING_SCENE_FIXED_STEP_SECONDS)
    expect(render).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('resize'))
    expect(create).toHaveBeenCalledTimes(1)
    expect(resize).toHaveBeenCalledTimes(2)

    unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('desenha um quadro estático sem iniciar updates em movimento reduzido', () => {
    const render = jest.fn()
    const update = jest.fn()
    const definition = createDefinition({ render, update })
    const context = {
      clearRect: jest.fn(),
      setTransform: jest.fn(),
    } as unknown as CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () => context,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = createMatchMedia(true)
    window.requestAnimationFrame = jest.fn(() => 1)
    window.cancelAnimationFrame = jest.fn()

    const unmount = mountLivingScene(
      document.createElement('canvas'),
      definition,
    )

    expect(render).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()

    unmount()
  })

  it('cancela o loop quando a aba fica oculta e retoma sem salto de tempo', () => {
    let scheduledFrame: FrameRequestCallback | undefined
    let hidden = false
    const update = jest.fn()
    const definition = createDefinition({ render: jest.fn(), update })
    const context = {
      clearRect: jest.fn(),
      setTransform: jest.fn(),
    } as unknown as CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = jest.fn(() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = createMatchMedia(false)
    window.requestAnimationFrame = jest.fn((callback) => {
      scheduledFrame = callback
      return 27
    })
    window.cancelAnimationFrame = jest.fn()
    jest.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)

    const unmount = mountLivingScene(document.createElement('canvas'), definition)
    const cancelledFrame = scheduledFrame

    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    cancelledFrame?.(5000)
    expect(update).not.toHaveBeenCalled()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(27)

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    scheduledFrame?.(9000)
    expect(update).not.toHaveBeenCalled()

    unmount()
  })
})

function createDefinition({
  render,
  update,
}: {
  render: jest.Mock
  update: jest.Mock
}): LivingSceneDefinition {
  return {
    seed: 9,
    layer: 'overlay',
    renderer: {
      create() {
        return {
          resize() {},
          update,
          render,
        }
      },
    },
  }
}

function createMatchMedia(matches: boolean): typeof window.matchMedia {
  return jest.fn(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
}
