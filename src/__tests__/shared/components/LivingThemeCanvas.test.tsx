import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { LivingThemeCanvas } from '@/shared/components/LivingThemeCanvas'

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

  it('inicia a cena, limita a resolução e encerra o loop ao desmontar', () => {
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
    const canvas = container.querySelector('canvas')

    expect(canvas).toHaveAttribute('data-living-scene', 'web-city')
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(addMotionListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(canvas?.width).toBeGreaterThan(0)
    expect(canvas?.height).toBeGreaterThan(0)

    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(41)
    expect(removeMotionListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
