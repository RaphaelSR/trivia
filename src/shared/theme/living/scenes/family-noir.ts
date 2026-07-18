import type { LivingSceneRenderer, LivingSceneViewport } from '../types'
import {
  TAU,
  clamp,
  drawRadialGlow,
  getActiveCount,
  lerp,
  smoothstep,
  viewportScale,
  wrap,
} from './scene-utils'

type WindowRain = {
  x: number
  y: number
  speed: number
  length: number
  drift: number
  depth: number
}

type LampGlow = {
  x: number
  y: number
  radius: number
  phase: number
  strength: number
}

type DustMote = {
  x: number
  y: number
  speed: number
  phase: number
  depth: number
  size: number
}

type PassingFigure = {
  progress: number
  direction: 1 | -1
  phase: number
}

const MAX_RAIN = 62
const MAX_DUST = 34

const WINDOW = {
  left: 0.645,
  top: 0.235,
  width: 0.27,
  height: 0.34,
} as const

export const familyNoirRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random, emitAudioEvent = () => undefined }) {
    let viewport = initialViewport
    let blindPhase = random() * TAU
    let lampFlicker = 0
    let nextLampFlicker = 3 + random() * 7
    let carApproach = -1
    let nextCar = 5 + random() * 8
    let nextFigure = 4 + random() * 8

    const rain: WindowRain[] = Array.from({ length: MAX_RAIN }, () => ({
      x: random(),
      y: random(),
      speed: 0.22 + random() * 0.62,
      length: 7 + random() * 23,
      drift: -0.025 - random() * 0.05,
      depth: 0.2 + random() * 0.8,
    }))

    const lamps: LampGlow[] = [
      { x: 0.034, y: 0.43, radius: 0.13, phase: random() * TAU, strength: 1 },
      {
        x: 0.175,
        y: 0.31,
        radius: 0.09,
        phase: random() * TAU,
        strength: 0.72,
      },
      { x: 0.49, y: 0.56, radius: 0.1, phase: random() * TAU, strength: 0.58 },
      {
        x: 0.965,
        y: 0.44,
        radius: 0.14,
        phase: random() * TAU,
        strength: 0.88,
      },
    ]

    const dust: DustMote[] = Array.from({ length: MAX_DUST }, () => ({
      x: 0.08 + random() * 0.84,
      y: 0.18 + random() * 0.62,
      speed: 0.003 + random() * 0.009,
      phase: random() * TAU,
      depth: 0.2 + random() * 0.8,
      size: 0.45 + random() * 1.45,
    }))

    const figure: PassingFigure = {
      progress: -1,
      direction: random() > 0.5 ? 1 : -1,
      phase: random() * TAU,
    }

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        blindPhase = wrap(blindPhase + delta * 0.16, TAU)
        nextLampFlicker -= delta
        if (carApproach < 0) nextCar -= delta
        if (figure.progress < 0) nextFigure -= delta
        lampFlicker = Math.max(0, lampFlicker - delta * 2.8)

        if (nextLampFlicker <= 0) {
          lampFlicker = 1
          nextLampFlicker = 7 + random() * 12
          emitAudioEvent({ cue: 'lamp-flicker', x: 0.18, intensity: 0.35 })
        }
        if (nextCar <= 0 && carApproach < 0) {
          carApproach = 0
          emitAudioEvent({ cue: 'vehicle-pass', x: 0.82, intensity: 0.72 })
        }
        if (carApproach >= 0) {
          carApproach += delta * 0.085
          if (carApproach > 1.25) {
            carApproach = -1
            nextCar = 12 + random() * 16
          }
        }
        if (nextFigure <= 0 && figure.progress < 0) {
          figure.progress = 0
          figure.direction = random() > 0.5 ? 1 : -1
        }
        if (figure.progress >= 0) {
          figure.progress += delta * 0.075
          if (figure.progress > 1.18) {
            figure.progress = -1
            nextFigure = 10 + random() * 15
          }
        }

        rain.forEach((drop) => {
          drop.y += delta * drop.speed
          drop.x += delta * drop.drift
          if (drop.y > 1.08 || drop.x < -0.08) {
            drop.y = -0.08 - random() * 0.22
            drop.x = random() * 1.08
          }
        })
        dust.forEach((mote) => {
          mote.y -= delta * mote.speed
          mote.x += Math.sin(mote.phase + mote.y * 10) * delta * 0.0025
          if (mote.y < 0.08) {
            mote.y = 0.86
            mote.x = 0.08 + random() * 0.84
          }
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawWindowWeather(
          context,
          viewport,
          rain,
          figure,
          blindPhase,
          carApproach,
          elapsedSeconds,
        )
        drawFloorHeadlightReflections(context, viewport, carApproach)
        drawLampAtmosphere(
          context,
          viewport,
          lamps,
          elapsedSeconds,
          lampFlicker,
        )
        drawDust(context, viewport, dust, elapsedSeconds)
      },
    }
  },
}

function drawWindowWeather(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  rain: WindowRain[],
  figure: PassingFigure,
  blindPhase: number,
  carApproach: number,
  elapsedSeconds: number,
) {
  const windowX = WINDOW.left * viewport.width
  const windowY = WINDOW.top * viewport.height
  const windowWidth = WINDOW.width * viewport.width
  const windowHeight = WINDOW.height * viewport.height

  context.save()
  context.beginPath()
  context.rect(windowX, windowY, windowWidth, windowHeight)
  context.clip()

  drawWindowRain(
    context,
    viewport,
    rain,
    windowX,
    windowY,
    windowWidth,
    windowHeight,
  )
  drawCarHeadlights(context, viewport, carApproach)
  if (figure.progress >= 0) {
    drawPassingFigure(context, viewport, figure, elapsedSeconds)
  }
  drawMovingBlinds(context, viewport, blindPhase)
  context.restore()
}

function drawWindowRain(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  rain: WindowRain[],
  windowX: number,
  windowY: number,
  windowWidth: number,
  windowHeight: number,
) {
  const activeRain = getActiveCount(rain.length, viewport, 24)
  context.save()
  context.globalCompositeOperation = 'screen'
  context.lineCap = 'round'
  rain.slice(0, activeRain).forEach((drop) => {
    const x = windowX + drop.x * windowWidth
    const y = windowY + drop.y * windowHeight
    context.strokeStyle = `rgba(183,205,214,${0.035 + drop.depth * 0.1})`
    context.lineWidth = 0.4 + drop.depth * 0.7
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + drop.drift * drop.length, y + drop.length)
    context.stroke()
  })
  context.restore()
}

function carIntensity(carApproach: number) {
  if (carApproach < 0) return 0.12
  const progress = clamp(carApproach)
  return 0.12 + Math.sin(progress * Math.PI) * 0.88
}

function drawCarHeadlights(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  carApproach: number,
) {
  const progress = carApproach < 0 ? 1 : smoothstep(clamp(carApproach * 1.75))
  const intensity = carIntensity(carApproach)
  const centerX = lerp(0.94, 0.845, progress) * viewport.width
  const y = viewport.height * lerp(0.535, 0.505, progress)
  const separation = viewport.width * 0.016
  const radius =
    Math.min(viewport.width, viewport.height) * (0.065 + intensity * 0.025)

  context.save()
  context.globalCompositeOperation = 'screen'
  for (const direction of [-1, 1]) {
    const x = centerX + separation * direction
    drawRadialGlow(
      context,
      x,
      y,
      radius,
      `rgba(255,218,150,${0.08 + intensity * 0.18})`,
    )
    context.fillStyle = `rgba(255,240,199,${0.16 + intensity * 0.48})`
    context.beginPath()
    context.ellipse(x, y, 3.6, 2.5, 0, 0, TAU)
    context.fill()
  }
  context.restore()
}

function drawPassingFigure(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  figure: PassingFigure,
  elapsedSeconds: number,
) {
  const progress = smoothstep(clamp(figure.progress))
  const normalizedX =
    figure.direction === 1
      ? lerp(WINDOW.left - 0.03, WINDOW.left + WINDOW.width + 0.03, progress)
      : lerp(WINDOW.left + WINDOW.width + 0.03, WINDOW.left - 0.03, progress)
  const scale = viewportScale(viewport) * 0.88
  const x = normalizedX * viewport.width
  const groundY = viewport.height * 0.575
  const stride = Math.sin(elapsedSeconds * 5.5 + figure.phase)

  context.save()
  context.translate(x, groundY)
  context.scale(figure.direction, 1)
  context.fillStyle = 'rgba(2,3,4,0.7)'
  context.strokeStyle = 'rgba(2,3,4,0.72)'
  context.lineWidth = 3 * scale
  context.lineCap = 'round'
  context.beginPath()
  context.arc(0, -31 * scale, 4.2 * scale, 0, TAU)
  context.fill()
  context.beginPath()
  context.moveTo(0, -26 * scale)
  context.lineTo(0, -10 * scale)
  context.moveTo(0, -22 * scale)
  context.lineTo(7 * scale, -12 * scale + stride * scale)
  context.moveTo(0, -22 * scale)
  context.lineTo(-6 * scale, -13 * scale - stride * scale)
  context.moveTo(0, -10 * scale)
  context.lineTo(6 * scale, stride * 3 * scale)
  context.moveTo(0, -10 * scale)
  context.lineTo(-6 * scale, -stride * 3 * scale)
  context.stroke()
  context.restore()
}

function drawMovingBlinds(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  blindPhase: number,
) {
  const x = WINDOW.left * viewport.width
  const y = WINDOW.top * viewport.height
  const width = WINDOW.width * viewport.width
  const height = WINDOW.height * viewport.height
  const lineCount = 14
  const sweep = 0.5 + Math.sin(blindPhase) * 0.5

  context.save()
  context.fillStyle = 'rgba(3,3,3,0.12)'
  for (let line = 0; line < lineCount; line += 1) {
    const lineY = y + (line / lineCount) * height
    context.fillRect(
      x,
      lineY,
      width,
      Math.max(1.2, (height / lineCount) * 0.31),
    )
  }
  context.globalCompositeOperation = 'screen'
  const gradient = context.createLinearGradient(x, y, x + width, y)
  gradient.addColorStop(0, 'rgba(213,189,147,0)')
  gradient.addColorStop(clamp(sweep - 0.16), 'rgba(213,189,147,0)')
  gradient.addColorStop(sweep, 'rgba(213,189,147,0.035)')
  gradient.addColorStop(clamp(sweep + 0.16), 'rgba(213,189,147,0)')
  gradient.addColorStop(1, 'rgba(213,189,147,0)')
  context.fillStyle = gradient
  context.fillRect(x, y, width, height)
  context.restore()
}

function drawFloorHeadlightReflections(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  carApproach: number,
) {
  const intensity = carIntensity(carApproach)
  if (intensity <= 0.13) return
  const progress = carApproach < 0 ? 1 : smoothstep(clamp(carApproach * 1.75))
  const centerX = lerp(0.94, 0.845, progress) * viewport.width
  const startY = viewport.height * 0.55
  const endY = viewport.height * 0.91

  context.save()
  context.globalCompositeOperation = 'screen'
  for (const direction of [-1, 1]) {
    const x = centerX + viewport.width * 0.016 * direction
    const gradient = context.createLinearGradient(x, startY, x, endY)
    gradient.addColorStop(0, `rgba(255,210,137,${intensity * 0.09})`)
    gradient.addColorStop(1, 'rgba(255,210,137,0)')
    context.strokeStyle = gradient
    context.lineWidth = Math.max(2, viewport.width * 0.012)
    context.beginPath()
    context.moveTo(x, startY)
    context.lineTo(x + direction * viewport.width * 0.035, endY)
    context.stroke()
  }
  context.restore()
}

function drawLampAtmosphere(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  lamps: LampGlow[],
  elapsedSeconds: number,
  lampFlicker: number,
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  lamps.forEach((lamp, index) => {
    const pulse = 0.88 + Math.sin(elapsedSeconds * 0.38 + lamp.phase) * 0.08
    const flicker =
      lampFlicker > 0
        ? 0.74 +
          Math.sin(elapsedSeconds * 31 + index * 2.3) * 0.24 * lampFlicker
        : 1
    drawRadialGlow(
      context,
      lamp.x * viewport.width,
      lamp.y * viewport.height,
      lamp.radius * Math.min(viewport.width, viewport.height),
      `rgba(255,162,67,${0.035 * lamp.strength * pulse * flicker})`,
    )
  })
  context.restore()
}

function drawDust(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  dust: DustMote[],
  elapsedSeconds: number,
) {
  const activeDust = getActiveCount(dust.length, viewport, 12)
  context.save()
  context.globalCompositeOperation = 'screen'
  dust.slice(0, activeDust).forEach((mote) => {
    const pulse = 0.5 + Math.sin(elapsedSeconds * 0.7 + mote.phase) * 0.35
    context.fillStyle = `rgba(228,185,117,${(0.018 + mote.depth * 0.045) * pulse})`
    context.beginPath()
    context.arc(
      mote.x * viewport.width,
      mote.y * viewport.height,
      mote.size * mote.depth,
      0,
      TAU,
    )
    context.fill()
  })
  context.restore()
}
