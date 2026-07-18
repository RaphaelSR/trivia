import '@testing-library/jest-dom'
import { act, render, waitFor } from '@testing-library/react'
import { LivingThemeCanvas } from '@/shared/components/LivingThemeCanvas'
import { LIVING_SCENE_REGISTRY } from '@/shared/theme/living/registry'
import type { LivingSceneRenderer } from '@/shared/theme/living/types'

describe('LivingThemeCanvas', () => {
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

  it('carrega o renderer, inicia a cena e encerra o loop ao desmontar', async () => {
    const addMotionListener = jest.fn()
    const removeMotionListener = jest.fn()
    const context = {} as CanvasRenderingContext2D
    HTMLCanvasElement.prototype.getContext = jest.fn(() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = jest.fn(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: addMotionListener,
      removeEventListener: removeMotionListener,
      dispatchEvent: jest.fn(),
    }))
    window.requestAnimationFrame = jest.fn(() => 41)
    window.cancelAnimationFrame = jest.fn()

    const { container, unmount } = render(<LivingThemeCanvas theme="web-city" />)
    expect(container.querySelector('canvas')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(container.querySelector('canvas')).toHaveAttribute(
        'data-living-scene',
        'web-city',
      )
    })
    const canvas = container.querySelector('canvas')

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(addMotionListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(canvas?.width).toBeGreaterThan(0)
    expect(canvas?.height).toBeGreaterThan(0)

    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(41)
    expect(removeMotionListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('ignora imports concluídos após troca de tema ou unmount', async () => {
    let resolveWebCity!: (renderer: LivingSceneRenderer) => void
    let resolveDeepSpace!: (renderer: LivingSceneRenderer) => void
    const webCityPromise = new Promise<LivingSceneRenderer>((resolve) => {
      resolveWebCity = resolve
    })
    const deepSpacePromise = new Promise<LivingSceneRenderer>((resolve) => {
      resolveDeepSpace = resolve
    })
    const originalWebCityLoader = LIVING_SCENE_REGISTRY['web-city'].loadRenderer
    const originalDeepSpaceLoader = LIVING_SCENE_REGISTRY['deep-space'].loadRenderer
    const renderer: LivingSceneRenderer = {
      create: () => ({
        resize() {},
        update() {},
        render() {},
      }),
    }

    LIVING_SCENE_REGISTRY['web-city'].loadRenderer = () => webCityPromise
    LIVING_SCENE_REGISTRY['deep-space'].loadRenderer = () => deepSpacePromise
    window.requestAnimationFrame = jest.fn(() => 41)
    window.cancelAnimationFrame = jest.fn()

    try {
      const { container, rerender, unmount } = render(
        <LivingThemeCanvas theme="web-city" />,
      )
      rerender(<LivingThemeCanvas theme="deep-space" />)

      await act(async () => {
        resolveWebCity(renderer)
        await webCityPromise
      })
      expect(container.querySelector('canvas')).not.toBeInTheDocument()
      expect(window.requestAnimationFrame).not.toHaveBeenCalled()

      unmount()
      await act(async () => {
        resolveDeepSpace(renderer)
        await deepSpacePromise
      })
      expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    } finally {
      LIVING_SCENE_REGISTRY['web-city'].loadRenderer = originalWebCityLoader
      LIVING_SCENE_REGISTRY['deep-space'].loadRenderer = originalDeepSpaceLoader
    }
  })
})
