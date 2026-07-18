import { getSceneDensity, seededRandom } from './core'
import type { LivingSceneDefinition, LivingSceneViewport } from './types'

export const LIVING_SCENE_FPS = 30
export const LIVING_SCENE_FIXED_STEP_SECONDS = 1 / LIVING_SCENE_FPS
export const LIVING_SCENE_MAX_DELTA_SECONDS = 0.1
export const LIVING_SCENE_MAX_DPR = 1.5
export const LIVING_SCENE_MAX_PIXELS = 4_194_304

const MAX_UPDATES_PER_FRAME = 3

export function createLivingSceneViewport(
  width: number,
  height: number,
  devicePixelRatio: number,
): LivingSceneViewport {
  const safeWidth = Math.max(1, Number.isFinite(width) ? width : 1)
  const safeHeight = Math.max(1, Number.isFinite(height) ? height : 1)
  const requestedDpr = Math.min(
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1,
    LIVING_SCENE_MAX_DPR,
  )
  const pixelLimitedDpr = Math.sqrt(
    LIVING_SCENE_MAX_PIXELS / (safeWidth * safeHeight),
  )

  return {
    width: safeWidth,
    height: safeHeight,
    dpr: Math.min(requestedDpr, pixelLimitedDpr),
    density: getSceneDensity(safeWidth),
  }
}

export function mountLivingScene(
  canvas: HTMLCanvasElement,
  definition: LivingSceneDefinition,
) {
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) return () => undefined
  const context: CanvasRenderingContext2D = canvasContext
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  let reduceMotion = motionQuery.matches
  let viewport = readViewport()
  const scene = definition.renderer.create({
    viewport,
    seed: definition.seed,
    random: seededRandom(definition.seed),
  })
  let frameId = 0
  let disposed = false
  let lastFrameMs: number | null = null
  let accumulatorSeconds = 0
  let elapsedSeconds = 0

  function readViewport() {
    return createLivingSceneViewport(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio || 1,
    )
  }

  function sizeCanvas() {
    canvas.width = Math.max(1, Math.floor(viewport.width * viewport.dpr))
    canvas.height = Math.max(1, Math.floor(viewport.height * viewport.dpr))
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
  }

  function render() {
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0)
    scene.render(context, viewport, elapsedSeconds)
  }

  function resize() {
    viewport = readViewport()
    sizeCanvas()
    scene.resize(viewport)
    if (reduceMotion) render()
  }

  function animate(timeMs: number) {
    if (disposed || document.hidden || reduceMotion) return

    if (lastFrameMs === null) {
      lastFrameMs = timeMs
      render()
      frameId = window.requestAnimationFrame(animate)
      return
    }

    const deltaSeconds = Math.min(
      Math.max(0, (timeMs - lastFrameMs) / 1000),
      LIVING_SCENE_MAX_DELTA_SECONDS,
    )
    lastFrameMs = timeMs
    accumulatorSeconds += deltaSeconds

    let updateCount = 0
    while (
      accumulatorSeconds >= LIVING_SCENE_FIXED_STEP_SECONDS &&
      updateCount < MAX_UPDATES_PER_FRAME
    ) {
      scene.update(LIVING_SCENE_FIXED_STEP_SECONDS)
      elapsedSeconds += LIVING_SCENE_FIXED_STEP_SECONDS
      accumulatorSeconds -= LIVING_SCENE_FIXED_STEP_SECONDS
      updateCount += 1
    }

    if (updateCount === MAX_UPDATES_PER_FRAME) {
      accumulatorSeconds %= LIVING_SCENE_FIXED_STEP_SECONDS
    }
    if (updateCount > 0) render()

    frameId = window.requestAnimationFrame(animate)
  }

  function stopFrame() {
    window.cancelAnimationFrame(frameId)
    frameId = 0
    lastFrameMs = null
    accumulatorSeconds = 0
  }

  function start() {
    stopFrame()
    if (disposed || document.hidden) return
    if (reduceMotion) render()
    else frameId = window.requestAnimationFrame(animate)
  }

  function handleVisibility() {
    if (document.hidden) stopFrame()
    else {
      resize()
      start()
    }
  }

  function handleMotionChange(event: MediaQueryListEvent) {
    reduceMotion = event.matches
    start()
  }

  sizeCanvas()
  scene.resize(viewport)
  start()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', handleVisibility)
  motionQuery.addEventListener('change', handleMotionChange)

  return () => {
    disposed = true
    stopFrame()
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', handleVisibility)
    motionQuery.removeEventListener('change', handleMotionChange)
    scene.dispose?.()
  }
}
