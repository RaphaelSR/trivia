import '@testing-library/jest-dom'
import { act, render } from '@testing-library/react'
import { BrazilBackground } from '@/shared/components/BrazilBackground'
import { EasterBackground } from '@/shared/components/EasterBackground'

describe.each([
  ['Brasil', BrazilBackground],
  ['Páscoa', EasterBackground],
] as const)('%s background', (_name, Background) => {
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

  it('desenha estático sem RAF e repovoa ao redimensionar', () => {
    const context = createCanvasContext()
    HTMLCanvasElement.prototype.getContext = jest.fn(() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = createMatchMedia(true).matchMedia
    window.requestAnimationFrame = jest.fn(() => 12)
    window.cancelAnimationFrame = jest.fn()

    render(<Background motionMode="full" />)
    const drawsBeforeResize = context.clearRect.mock.calls.length

    expect(drawsBeforeResize).toBeGreaterThan(0)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()

    act(() => window.dispatchEvent(new Event('resize')))
    expect(context.clearRect.mock.calls.length).toBeGreaterThan(drawsBeforeResize)
  })

  it('para e retoma o loop quando reduzir movimento muda em tempo real', () => {
    const context = createCanvasContext()
    const media = createMatchMedia(false)
    HTMLCanvasElement.prototype.getContext = jest.fn(() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext
    window.matchMedia = media.matchMedia
    window.requestAnimationFrame = jest.fn(() => 23)
    window.cancelAnimationFrame = jest.fn()

    render(<Background motionMode="full" />)
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    act(() => media.emit(true))
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(23)
    const requestsWhileReduced = (window.requestAnimationFrame as jest.Mock).mock.calls.length

    act(() => media.emit(false))
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(requestsWhileReduced + 1)
  })
})

function createCanvasContext() {
  const gradient = { addColorStop: jest.fn() }
  return new Proxy({
    clearRect: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
  } as Record<string, unknown>, {
    get(target, property) {
      if (!(property in target)) target[property as string] = jest.fn()
      return target[property as string]
    },
  }) as unknown as CanvasRenderingContext2D & { clearRect: jest.Mock }
}

function createMatchMedia(initialMatches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined
  const query = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn((_type: string, nextListener: (event: MediaQueryListEvent) => void) => {
      listener = nextListener
    }),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }
  const matchMedia = jest.fn(
    () => query as unknown as MediaQueryList,
  ) as unknown as typeof window.matchMedia
  return {
    matchMedia,
    emit(matches: boolean) {
      query.matches = matches
      listener?.({ matches } as MediaQueryListEvent)
    },
  }
}
