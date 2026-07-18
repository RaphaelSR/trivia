import type { LivingSceneRenderer, LivingSceneViewport } from '../types'
import {
  TAU,
  clamp,
  drawRadialGlow,
  getActiveCount,
  viewportScale,
  wrap,
} from './scene-utils'

type OceanBand = {
  y: number
  amplitude: number
  frequency: number
  speed: number
  phase: number
  alpha: number
  depth: number
}

type MistBank = {
  x: number
  y: number
  speed: number
  radius: number
  phase: number
  depth: number
}

type IceFloe = {
  x: number
  y: number
  speed: number
  size: number
  phase: number
  rotation: number
  depth: number
}

type LightGlint = {
  x: number
  y: number
  width: number
  speed: number
  phase: number
  alpha: number
}

const MAX_MIST_BANKS = 10
const MAX_ICE_FLOES = 9
const MAX_GLINTS = 34

export const moonlitLinerRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random }) {
    let viewport = initialViewport
    let deckGlow = 0
    let nextDeckGlow = 4 + random() * 6
    let iceSpark = 0
    let iceSparkX = 0.78
    let iceSparkY = 0.68
    let nextIceSpark = 3 + random() * 7

    const waves: OceanBand[] = Array.from({ length: 7 }, (_, index) => ({
      y: 0.69 + index * 0.052,
      amplitude: 0.003 + index * 0.0019,
      frequency: 1.7 + index * 0.38 + random() * 0.24,
      speed: 0.16 + index * 0.035 + random() * 0.04,
      phase: random() * TAU,
      alpha: 0.035 + index * 0.012,
      depth: 0.3 + index / 9,
    }))

    const mist: MistBank[] = Array.from({ length: MAX_MIST_BANKS }, () => ({
      x: random(),
      y: 0.61 + random() * 0.18,
      speed: 0.0025 + random() * 0.006,
      radius: 0.08 + random() * 0.15,
      phase: random() * TAU,
      depth: 0.22 + random() * 0.78,
    }))

    const floes: IceFloe[] = Array.from(
      { length: MAX_ICE_FLOES },
      (_, index) => ({
        x: wrap(0.12 + index / MAX_ICE_FLOES + random() * 0.13),
        y: 0.76 + random() * 0.22,
        speed: 0.003 + random() * 0.006,
        size: 0.018 + random() * 0.035,
        phase: random() * TAU,
        rotation: (random() - 0.5) * 0.55,
        depth: 0.35 + random() * 0.65,
      }),
    )

    const glints: LightGlint[] = Array.from({ length: MAX_GLINTS }, () => ({
      x: 0.53 + random() * 0.34,
      y: 0.67 + random() * 0.31,
      width: 0.006 + random() * 0.026,
      speed: 0.22 + random() * 0.62,
      phase: random() * TAU,
      alpha: 0.08 + random() * 0.2,
    }))

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        nextDeckGlow -= delta
        nextIceSpark -= delta
        deckGlow = Math.max(0, deckGlow - delta * 0.32)
        iceSpark = Math.max(0, iceSpark - delta * 1.5)

        if (nextDeckGlow <= 0) {
          deckGlow = 1
          nextDeckGlow = 9 + random() * 13
        }
        if (nextIceSpark <= 0) {
          iceSpark = 1
          iceSparkX = 0.7 + random() * 0.22
          iceSparkY = 0.62 + random() * 0.22
          nextIceSpark = 7 + random() * 12
        }

        waves.forEach((wave) => {
          wave.phase = wrap(wave.phase + delta * wave.speed, TAU)
        })
        mist.forEach((bank) => {
          bank.x = wrap(bank.x + delta * bank.speed)
        })
        floes.forEach((floe) => {
          floe.x -= delta * floe.speed
          floe.rotation += delta * Math.sin(floe.phase) * 0.004
          if (floe.x < -0.15) {
            floe.x = 1.14 + random() * 0.08
            floe.y = 0.76 + random() * 0.22
            floe.size = 0.018 + random() * 0.035
          }
        })
        glints.forEach((glint) => {
          glint.phase = wrap(glint.phase + delta * glint.speed, TAU)
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawMoonReflection(context, viewport, glints, elapsedSeconds)
        drawOceanBands(context, viewport, waves)
        drawMistBanks(context, viewport, mist, elapsedSeconds)

        const activeFloes = getActiveCount(floes.length, viewport, 4)
        floes
          .slice(0, activeFloes)
          .sort((left, right) => left.depth - right.depth)
          .forEach((floe) =>
            drawIceFloe(context, viewport, floe, elapsedSeconds),
          )

        drawDeckWindows(context, viewport, deckGlow, elapsedSeconds)
        if (iceSpark > 0) {
          drawIceSpark(context, viewport, iceSparkX, iceSparkY, iceSpark)
        }
      },
    }
  },
}

function drawMoonReflection(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  glints: LightGlint[],
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  const activeGlints = getActiveCount(glints.length, viewport, 14)

  context.save()
  context.globalCompositeOperation = 'screen'
  const wash = context.createRadialGradient(
    width * 0.69,
    height * 0.7,
    0,
    width * 0.69,
    height * 0.7,
    Math.min(width, height) * 0.42,
  )
  wash.addColorStop(0, 'rgba(184,222,246,0.055)')
  wash.addColorStop(1, 'rgba(184,222,246,0)')
  context.fillStyle = wash
  context.fillRect(width * 0.38, height * 0.52, width * 0.62, height * 0.48)

  glints.slice(0, activeGlints).forEach((glint, index) => {
    const taper = 1 - Math.abs(glint.x - 0.69) / 0.22
    const pulse =
      0.42 + Math.sin(glint.phase + elapsedSeconds * glint.speed) * 0.34
    if (taper <= 0 || pulse <= 0.08) return
    const x = glint.x * width + Math.sin(glint.phase * 1.7) * width * 0.008
    const y = glint.y * height
    const glintWidth = glint.width * width * (0.6 + (glint.y - 0.66) * 1.7)
    context.strokeStyle =
      index % 5 === 0
        ? `rgba(255,232,188,${glint.alpha * pulse * taper})`
        : `rgba(205,235,252,${glint.alpha * pulse * taper})`
    context.lineWidth = 0.7 + (glint.y - 0.66) * 2.4
    context.beginPath()
    context.moveTo(x - glintWidth, y)
    context.quadraticCurveTo(
      x,
      y + Math.sin(glint.phase) * 2,
      x + glintWidth,
      y,
    )
    context.stroke()
  })
  context.restore()
}

function drawOceanBands(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  waves: OceanBand[],
) {
  const { width, height } = viewport
  context.save()
  context.lineCap = 'round'
  waves.forEach((wave, index) => {
    const segments = 18
    context.strokeStyle =
      index % 3 === 0
        ? `rgba(214,236,247,${wave.alpha})`
        : `rgba(98,164,197,${wave.alpha})`
    context.lineWidth = 0.55 + wave.depth * 0.75
    context.beginPath()
    for (let segment = 0; segment <= segments; segment += 1) {
      const progress = segment / segments
      const x = progress * width
      const y =
        height *
        (wave.y +
          Math.sin(progress * TAU * wave.frequency + wave.phase) *
            wave.amplitude +
          Math.sin(progress * TAU * 0.72 - wave.phase * 0.6) *
            wave.amplitude *
            0.46)
      if (segment === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.stroke()
  })
  context.restore()
}

function drawMistBanks(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  mist: MistBank[],
  elapsedSeconds: number,
) {
  const activeMist = getActiveCount(mist.length, viewport, 4)
  context.save()
  context.globalCompositeOperation = 'screen'
  mist.slice(0, activeMist).forEach((bank) => {
    const x = bank.x * viewport.width
    const y =
      viewport.height *
      (bank.y + Math.sin(elapsedSeconds * 0.07 + bank.phase) * 0.012)
    const radiusX = bank.radius * viewport.width
    const radiusY = radiusX * (0.13 + bank.depth * 0.08)
    context.save()
    context.translate(x, y)
    context.scale(1, radiusY / radiusX)
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX)
    gradient.addColorStop(0, `rgba(195,219,232,${0.018 + bank.depth * 0.026})`)
    gradient.addColorStop(1, 'rgba(195,219,232,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(0, 0, radiusX, 0, TAU)
    context.fill()
    context.restore()
  })
  context.restore()
}

function drawIceFloe(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  floe: IceFloe,
  elapsedSeconds: number,
) {
  const scale = viewportScale(viewport) * floe.depth
  const radius = floe.size * Math.min(viewport.width, viewport.height) * scale
  const x = floe.x * viewport.width
  const y =
    floe.y * viewport.height +
    Math.sin(elapsedSeconds * 0.48 + floe.phase) * 2.3 * scale
  const points = 7

  context.save()
  context.translate(x, y)
  context.rotate(
    floe.rotation + Math.sin(elapsedSeconds * 0.13 + floe.phase) * 0.025,
  )
  context.fillStyle = `rgba(154,196,219,${0.09 + floe.depth * 0.09})`
  context.strokeStyle = `rgba(220,241,250,${0.12 + floe.depth * 0.13})`
  context.lineWidth = 0.65 + floe.depth * 0.5
  context.beginPath()
  for (let point = 0; point < points; point += 1) {
    const angle = (point / points) * TAU
    const variance = 0.72 + Math.sin(floe.phase * 3 + point * 4.1) * 0.18
    const pointX = Math.cos(angle) * radius * variance
    const pointY = Math.sin(angle) * radius * variance * 0.3
    if (point === 0) context.moveTo(pointX, pointY)
    else context.lineTo(pointX, pointY)
  }
  context.closePath()
  context.fill()
  context.stroke()
  context.restore()
}

function drawDeckWindows(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  deckGlow: number,
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  const scale = viewportScale(viewport)
  const intensity = clamp(0.25 + deckGlow * 0.75)
  context.save()
  context.globalCompositeOperation = 'screen'
  for (let row = 0; row < 3; row += 1) {
    const windowCount = row === 2 ? 8 : 6
    for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
      const x = width * (0.105 + windowIndex * 0.033 + row * 0.012)
      const y = height * (0.535 + row * 0.045)
      const pulse =
        0.38 + Math.sin(elapsedSeconds * 0.7 + windowIndex * 1.7 + row) * 0.12
      context.fillStyle = `rgba(255,190,102,${(0.045 + pulse * 0.055) * intensity})`
      context.fillRect(x, y, 3.2 * scale, 1.8 * scale)
    }
  }
  if (deckGlow > 0) {
    drawRadialGlow(
      context,
      width * 0.25,
      height * 0.58,
      Math.min(width, height) * 0.22,
      `rgba(255,176,82,${deckGlow * 0.045})`,
    )
  }
  context.restore()
}

function drawIceSpark(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  normalizedX: number,
  normalizedY: number,
  intensity: number,
) {
  const x = normalizedX * viewport.width
  const y = normalizedY * viewport.height
  const length = 11 + intensity * 16
  context.save()
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = `rgba(226,247,255,${intensity * 0.42})`
  context.lineWidth = 0.8
  context.beginPath()
  context.moveTo(x - length, y)
  context.lineTo(x + length, y)
  context.moveTo(x, y - length * 0.55)
  context.lineTo(x, y + length * 0.55)
  context.stroke()
  drawRadialGlow(
    context,
    x,
    y,
    length * 1.8,
    `rgba(206,240,255,${intensity * 0.12})`,
  )
  context.restore()
}
