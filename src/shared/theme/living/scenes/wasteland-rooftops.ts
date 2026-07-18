import type {
  LivingSceneRenderer,
  LivingSceneViewport,
} from '../types'
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

type RooftopRunner = {
  progress: number
  speed: number
  phase: number
  depth: number
  accent: string
  paused: number
}

type PatrolDrone = {
  x: number
  y: number
  speed: number
  phase: number
  direction: 1 | -1
  scan: number
  scanCooldown: number
}

type DustParticle = {
  x: number
  y: number
  speed: number
  size: number
  depth: number
  phase: number
}

const MAX_RUNNERS = 5
const MAX_DRONES = 4
const MAX_DUST = 64

export const wastelandRooftopsRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random }) {
    let viewport = initialViewport
    let stormFlash = 0
    let nextStorm = 4 + random() * 8
    let lightningShape = random() * 10
    let flare = 0
    let flareX = 0.5
    let nextFlare = 7 + random() * 7

    const runners: RooftopRunner[] = Array.from({ length: MAX_RUNNERS }, (_, index) => ({
      progress: wrap(index / MAX_RUNNERS + random() * 0.12),
      speed: 0.026 + random() * 0.018,
      phase: random() * TAU,
      depth: 0.72 + random() * 0.28,
      accent: ['#f2a65a', '#65d9d0', '#d27bff', '#f2d15c', '#ef6f6c'][index],
      paused: random() * 0.8,
    }))

    const drones: PatrolDrone[] = Array.from({ length: MAX_DRONES }, (_, index) => ({
      x: random(),
      y: 0.18 + random() * 0.28,
      speed: 0.018 + random() * 0.025,
      phase: random() * TAU,
      direction: index % 2 === 0 ? 1 : -1,
      scan: 0,
      scanCooldown: 1.5 + random() * 5,
    }))

    const dust: DustParticle[] = Array.from({ length: MAX_DUST }, () => ({
      x: random(),
      y: 0.12 + random() * 0.88,
      speed: 0.03 + random() * 0.12,
      size: 0.5 + random() * 2.8,
      depth: 0.15 + random() * 0.85,
      phase: random() * TAU,
    }))

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        nextStorm -= delta
        nextFlare -= delta
        stormFlash = Math.max(0, stormFlash - delta * 2.4)
        flare = Math.max(0, flare - delta * 0.22)

        if (nextStorm <= 0) {
          stormFlash = 1
          lightningShape = random() * 40
          nextStorm = 7 + random() * 14
        }
        if (nextFlare <= 0) {
          flare = 1
          flareX = 0.2 + random() * 0.6
          nextFlare = 10 + random() * 12
        }

        const activeRunners = getActiveCount(runners.length, viewport, 2)
        runners.slice(0, activeRunners).forEach((runner) => {
          if (runner.paused > 0) {
            runner.paused -= delta
            return
          }
          const previous = runner.progress
          runner.progress = wrap(runner.progress + delta * runner.speed)
          if (runner.progress < previous) {
            runner.speed = 0.025 + random() * 0.021
            if (random() > 0.72) runner.paused = 0.35 + random() * 0.8
          }
        })

        const activeDrones = getActiveCount(drones.length, viewport, 2)
        drones.slice(0, activeDrones).forEach((drone) => {
          drone.x += delta * drone.speed * drone.direction
          if (drone.x > 1.12) {
            drone.x = 1.12
            drone.direction = -1
          } else if (drone.x < -0.12) {
            drone.x = -0.12
            drone.direction = 1
          }
          drone.scanCooldown -= delta
          drone.scan = Math.max(0, drone.scan - delta)
          if (drone.scanCooldown <= 0) {
            drone.scan = 1.6 + random() * 1.1
            drone.scanCooldown = 4 + random() * 7
          }
        })

        dust.forEach((particle) => {
          particle.x = wrap(particle.x + delta * particle.speed)
          particle.y += Math.sin(particle.phase + particle.x * 9) * delta * 0.006
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawStorm(context, viewport, dust, elapsedSeconds, stormFlash, lightningShape)
        if (flare > 0) drawFlare(context, viewport, flareX, flare)
        drawRooftopRoute(context, viewport, elapsedSeconds)

        const activeDrones = getActiveCount(drones.length, viewport, 2)
        drones.slice(0, activeDrones).forEach((drone) => drawDrone(context, viewport, drone, elapsedSeconds))

        const activeRunners = getActiveCount(runners.length, viewport, 2)
        runners
          .slice(0, activeRunners)
          .sort((left, right) => left.depth - right.depth)
          .forEach((runner) => drawRunner(context, viewport, runner, elapsedSeconds))
      },
    }
  },
}

function drawStorm(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  dust: DustParticle[],
  elapsedSeconds: number,
  stormFlash: number,
  lightningShape: number,
) {
  const { width, height } = viewport
  context.save()
  const haze = context.createLinearGradient(0, height * 0.18, width, height * 0.82)
  haze.addColorStop(0, 'rgba(235,122,59,0.025)')
  haze.addColorStop(0.6, 'rgba(205,89,50,0.07)')
  haze.addColorStop(1, 'rgba(34,19,23,0.12)')
  context.fillStyle = haze
  context.fillRect(0, 0, width, height)

  const activeDust = getActiveCount(dust.length, viewport, 22)
  dust.slice(0, activeDust).forEach((particle) => {
    const x = particle.x * width
    const y = particle.y * height
    const tail = 10 + particle.depth * 45
    context.strokeStyle = `rgba(236,173,104,${0.018 + particle.depth * 0.07})`
    context.lineWidth = particle.size
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + tail, y + Math.sin(elapsedSeconds + particle.phase) * 4)
    context.stroke()
  })
  context.restore()

  if (stormFlash > 0) {
    const boltX = width * (0.2 + (lightningShape % 0.6))
    context.save()
    context.globalCompositeOperation = 'screen'
    context.strokeStyle = `rgba(226,220,255,${stormFlash * 0.48})`
    context.lineWidth = 1.2
    context.beginPath()
    context.moveTo(boltX, -10)
    for (let segment = 1; segment <= 8; segment += 1) {
      const y = height * 0.075 * segment
      const x = boltX + Math.sin(lightningShape * 2.7 + segment * 5.2) * width * 0.026
      context.lineTo(x, y)
    }
    context.stroke()
    context.fillStyle = `rgba(219,210,255,${stormFlash * 0.055})`
    context.fillRect(0, 0, width, height)
    context.restore()
  }
}

function drawFlare(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  flareX: number,
  flare: number,
) {
  const x = flareX * viewport.width
  const y = viewport.height * (0.56 - (1 - flare) * 0.28)
  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(context, x, y, Math.min(viewport.width, viewport.height) * 0.18, `rgba(255,104,63,${flare * 0.22})`)
  context.fillStyle = `rgba(255,235,198,${flare * 0.9})`
  context.beginPath()
  context.arc(x, y, 2.4, 0, TAU)
  context.fill()
  context.strokeStyle = `rgba(255,118,72,${flare * 0.35})`
  context.beginPath()
  context.moveTo(x, y + 3)
  context.bezierCurveTo(x - 7, y + 28, x + 14, y + 54, x - 4, y + 86)
  context.stroke()
  context.restore()
}

type RoofSegment = { start: number; end: number; y: number }

const ROOF_SEGMENTS: readonly RoofSegment[] = [
  { start: -0.04, end: 0.2, y: 0.78 },
  { start: 0.25, end: 0.46, y: 0.73 },
  { start: 0.51, end: 0.72, y: 0.8 },
  { start: 0.77, end: 1.04, y: 0.7 },
]

function roofYAt(progress: number) {
  const segment = ROOF_SEGMENTS.find(({ start, end }) => progress >= start && progress <= end)
  if (segment) return segment.y
  const next = ROOF_SEGMENTS.find(({ start }) => start > progress) ?? ROOF_SEGMENTS[0]
  const previous = [...ROOF_SEGMENTS].reverse().find(({ end }) => end < progress) ?? ROOF_SEGMENTS.at(-1)!
  const gapProgress = clamp((progress - previous.end) / (next.start - previous.end))
  return lerp(previous.y, next.y, smoothstep(gapProgress))
}

function jumpAt(progress: number) {
  let jump = 0
  for (let index = 0; index < ROOF_SEGMENTS.length - 1; index += 1) {
    const start = ROOF_SEGMENTS[index].end - 0.015
    const end = ROOF_SEGMENTS[index + 1].start + 0.015
    if (progress >= start && progress <= end) {
      jump = Math.sin(((progress - start) / (end - start)) * Math.PI)
    }
  }
  return jump
}

function drawRooftopRoute(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  context.save()
  ROOF_SEGMENTS.forEach((segment, index) => {
    const x = segment.start * width
    const y = segment.y * height
    const segmentWidth = (segment.end - segment.start) * width
    const gradient = context.createLinearGradient(0, y, 0, height)
    gradient.addColorStop(0, 'rgba(9,12,17,0.82)')
    gradient.addColorStop(1, 'rgba(3,5,8,0.96)')
    context.fillStyle = gradient
    context.fillRect(x, y, segmentWidth, height - y)
    context.fillStyle = index % 2 === 0 ? 'rgba(239,132,65,0.18)' : 'rgba(85,205,198,0.13)'
    context.fillRect(x, y, segmentWidth, 2)

    const antennaX = x + segmentWidth * (0.25 + index * 0.12)
    context.strokeStyle = 'rgba(12,13,16,0.88)'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(antennaX, y)
    context.lineTo(antennaX, y - height * (0.09 + index * 0.015))
    context.stroke()
    context.fillStyle = `rgba(255,91,67,${0.28 + Math.sin(elapsedSeconds * 2 + index) * 0.12})`
    context.beginPath()
    context.arc(antennaX, y - height * (0.09 + index * 0.015), 2, 0, TAU)
    context.fill()
  })

  context.strokeStyle = 'rgba(17,18,21,0.76)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(width * 0.05, height * 0.69)
  context.bezierCurveTo(width * 0.3, height * 0.78, width * 0.7, height * 0.62, width * 0.94, height * 0.66)
  context.stroke()
  context.restore()
}

function drawDrone(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  drone: PatrolDrone,
  elapsedSeconds: number,
) {
  const scale = viewportScale(viewport)
  const x = drone.x * viewport.width
  const y = (drone.y + Math.sin(elapsedSeconds * 0.9 + drone.phase) * 0.018) * viewport.height
  const width = 32 * scale
  const scanAmount = clamp(drone.scan / 1.6)

  context.save()
  context.translate(x, y)
  context.scale(drone.direction, 1)
  context.fillStyle = '#080d13'
  context.beginPath()
  context.moveTo(-width * 0.55, 0)
  context.lineTo(-width * 0.16, -width * 0.18)
  context.lineTo(width * 0.5, -width * 0.06)
  context.lineTo(width * 0.62, width * 0.1)
  context.lineTo(-width * 0.28, width * 0.16)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(104,220,212,0.44)'
  context.lineWidth = 1
  context.stroke()
  context.fillStyle = 'rgba(255,94,70,0.78)'
  context.beginPath()
  context.arc(width * 0.35, width * 0.02, 2.2 * scale, 0, TAU)
  context.fill()
  context.restore()

  if (scanAmount > 0) {
    const beam = context.createLinearGradient(x, y, x, viewport.height * 0.78)
    beam.addColorStop(0, `rgba(105,238,219,${scanAmount * 0.12})`)
    beam.addColorStop(1, 'rgba(105,238,219,0)')
    context.fillStyle = beam
    context.beginPath()
    context.moveTo(x - width * 0.1, y + width * 0.12)
    context.lineTo(x + width * 0.1, y + width * 0.12)
    context.lineTo(x + width * 1.2, viewport.height * 0.78)
    context.lineTo(x - width * 1.2, viewport.height * 0.78)
    context.closePath()
    context.fill()
  }
}

function drawRunner(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  runner: RooftopRunner,
  elapsedSeconds: number,
) {
  const scale = viewportScale(viewport) * runner.depth
  const jump = jumpAt(runner.progress)
  const x = runner.progress * viewport.width
  const y = roofYAt(runner.progress) * viewport.height - jump * 58 * scale
  const stride = Math.sin(elapsedSeconds * 9 + runner.phase) * (1 - jump * 0.7)
  const body = 34 * scale

  context.save()
  context.translate(x, y)
  context.fillStyle = 'rgba(0,0,0,0.4)'
  context.beginPath()
  context.ellipse(0, 3, 19 * scale * (1 - jump * 0.5), 4 * scale, 0, 0, TAU)
  context.fill()
  context.strokeStyle = '#11141a'
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = 6 * scale
  context.beginPath()
  context.moveTo(0, -body)
  context.lineTo(2 * scale, -body * 0.38)
  context.lineTo(10 * stride * scale, 0)
  context.moveTo(2 * scale, -body * 0.38)
  context.lineTo(-11 * stride * scale, 0)
  context.moveTo(0, -body * 0.8)
  context.lineTo(14 * scale, -body * (0.58 + stride * 0.08))
  context.moveTo(0, -body * 0.8)
  context.lineTo(-12 * scale, -body * (0.56 - stride * 0.08))
  context.stroke()
  context.fillStyle = '#10141b'
  context.beginPath()
  context.arc(0, -body * 1.15, 7 * scale, 0, TAU)
  context.fill()
  context.strokeStyle = runner.accent
  context.lineWidth = 2 * scale
  context.beginPath()
  context.moveTo(-3 * scale, -body * 0.9)
  context.bezierCurveTo(-18 * scale, -body * 0.82, -28 * scale, -body * (0.96 + stride * 0.05), -39 * scale, -body * 0.84)
  context.stroke()
  context.restore()
}
