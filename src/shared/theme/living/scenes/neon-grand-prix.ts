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

type RaceCar = {
  progress: number
  speed: number
  lane: number
  targetLane: number
  laneVelocity: number
  hue: number
  phase: number
  maneuverIn: number
  boost: number
  boostCooldown: number
}

type RainStreak = {
  x: number
  y: number
  speed: number
  length: number
  depth: number
}

const MAX_CARS = 9
const MAX_RAIN = 54

export const neonGrandPrixRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random }) {
    let viewport = initialViewport
    let raceClock = 0
    let leaderFlash = 0
    let nextLeaderFlash = 4 + random() * 4

    const cars: RaceCar[] = Array.from({ length: MAX_CARS }, (_, index) => ({
      progress: wrap(index / MAX_CARS + random() * 0.08),
      speed: 0.045 + random() * 0.026,
      lane: -0.82 + (index % 4) * 0.54 + (random() - 0.5) * 0.12,
      targetLane: -0.75 + random() * 1.5,
      laneVelocity: 0,
      hue: [186, 322, 42, 268, 8, 154][index % 6] + random() * 9,
      phase: random() * TAU,
      maneuverIn: 1.2 + random() * 4.8,
      boost: 0,
      boostCooldown: 2 + random() * 5,
    }))

    const rain: RainStreak[] = Array.from({ length: MAX_RAIN }, () => ({
      x: random(),
      y: random(),
      speed: 0.24 + random() * 0.52,
      length: 8 + random() * 25,
      depth: 0.2 + random() * 0.8,
    }))

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        raceClock += delta
        leaderFlash = Math.max(0, leaderFlash - delta)
        nextLeaderFlash -= delta
        if (nextLeaderFlash <= 0) {
          leaderFlash = 0.72
          nextLeaderFlash = 5 + random() * 6
        }

        const activeCars = getActiveCount(cars.length, viewport, 4)
        cars.slice(0, activeCars).forEach((car, index) => {
          car.maneuverIn -= delta
          car.boostCooldown -= delta
          car.boost = Math.max(0, car.boost - delta)

          if (car.maneuverIn <= 0) {
            const nearbyCar = cars
              .slice(0, activeCars)
              .find((candidate, candidateIndex) => candidateIndex !== index
                && Math.abs(candidate.progress - car.progress) < 0.12
                && Math.abs(candidate.lane - car.lane) < 0.34)
            car.targetLane = clamp(
              nearbyCar ? car.lane + (random() > 0.5 ? 0.48 : -0.48) : -0.82 + random() * 1.64,
              -0.92,
              0.92,
            )
            car.maneuverIn = 1.8 + random() * 4.6
          }

          if (car.boostCooldown <= 0 && car.progress > 0.18 && car.progress < 0.7) {
            car.boost = 0.8 + random() * 0.55
            car.boostCooldown = 5 + random() * 8
          }

          const laneForce = (car.targetLane - car.lane) * 2.5
          car.laneVelocity = (car.laneVelocity + laneForce * delta) * Math.pow(0.12, delta)
          car.lane = clamp(car.lane + car.laneVelocity * delta, -0.96, 0.96)
          const previousProgress = car.progress
          car.progress = wrap(car.progress + delta * (car.speed + (car.boost > 0 ? 0.026 : 0)))
          if (car.progress < previousProgress) {
            car.targetLane = -0.82 + random() * 1.64
          }
        })

        rain.forEach((streak) => {
          streak.y = wrap(streak.y + delta * streak.speed)
          streak.x = wrap(streak.x - delta * streak.speed * 0.11)
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawTrackAtmosphere(context, viewport, elapsedSeconds, leaderFlash)

        const activeRain = getActiveCount(rain.length, viewport, 20)
        drawRain(context, viewport, rain.slice(0, activeRain))

        const activeCars = getActiveCount(cars.length, viewport, 4)
        const visibleCars = cars
          .slice(0, activeCars)
          .map((car) => ({ car, placement: getTrackPlacement(car, viewport) }))
          .sort((left, right) => left.placement.y - right.placement.y)

        visibleCars.forEach(({ car, placement }, index) => {
          drawRaceCar(context, placement, car, viewport, elapsedSeconds, index === visibleCars.length - 1)
        })

        drawFinishPulse(context, viewport, raceClock)
      },
    }
  },
}

type TrackPlacement = {
  x: number
  y: number
  scale: number
  curve: number
}

function getTrackPlacement(car: RaceCar, viewport: LivingSceneViewport): TrackPlacement {
  const depth = smoothstep(car.progress)
  const horizon = viewport.height * 0.31
  const y = lerp(horizon, viewport.height * 1.08, Math.pow(depth, 0.86))
  const roadHalfWidth = lerp(viewport.width * 0.035, viewport.width * 0.58, depth)
  const curve = Math.sin(car.progress * 4.4 + 0.4) * viewport.width * (0.015 + depth * 0.075)
  return {
    x: viewport.width * 0.5 + curve + car.lane * roadHalfWidth * 0.72,
    y,
    scale: lerp(0.2, 1.6, Math.pow(depth, 1.2)) * viewportScale(viewport),
    curve,
  }
}

function drawTrackAtmosphere(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  elapsedSeconds: number,
  leaderFlash: number,
) {
  const { width, height } = viewport
  const horizonY = height * 0.31
  const pulse = 0.5 + Math.sin(elapsedSeconds * 2.1) * 0.18

  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(
    context,
    width * 0.5,
    horizonY,
    Math.min(width * 0.42, height * 0.55),
    `rgba(68,225,255,${0.07 + leaderFlash * 0.08})`,
  )

  for (let lane = -2; lane <= 2; lane += 1) {
    const laneOffset = lane * width * 0.115
    const gradient = context.createLinearGradient(width * 0.5, horizonY, width * 0.5 + laneOffset * 3.5, height)
    gradient.addColorStop(0, 'rgba(92,246,255,0.02)')
    gradient.addColorStop(1, lane % 2 === 0 ? `rgba(255,54,203,${0.1 * pulse})` : `rgba(78,225,255,${0.09 * pulse})`)
    context.strokeStyle = gradient
    context.lineWidth = Math.max(0.8, Math.abs(lane) * 0.35 + 0.7)
    context.beginPath()
    context.moveTo(width * 0.5 + lane * 3, horizonY)
    context.quadraticCurveTo(width * 0.57 + laneOffset * 0.4, height * 0.62, width * 0.5 + laneOffset * 3.5, height * 1.03)
    context.stroke()
  }
  context.restore()

  context.save()
  context.globalAlpha = 0.2
  context.strokeStyle = '#8cf8ff'
  context.setLineDash([3, 13])
  context.lineDashOffset = -elapsedSeconds * 32
  context.beginPath()
  context.moveTo(width * 0.5, horizonY)
  context.quadraticCurveTo(width * 0.58, height * 0.64, width * 0.68, height)
  context.stroke()
  context.restore()
}

function drawRain(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  rain: RainStreak[],
) {
  context.save()
  context.lineCap = 'round'
  rain.forEach((streak) => {
    const x = streak.x * viewport.width
    const y = streak.y * viewport.height
    context.strokeStyle = `rgba(151,239,255,${0.035 + streak.depth * 0.085})`
    context.lineWidth = 0.4 + streak.depth * 0.65
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - streak.length * 0.22, y + streak.length)
    context.stroke()
  })
  context.restore()
}

function drawRaceCar(
  context: CanvasRenderingContext2D,
  placement: TrackPlacement,
  car: RaceCar,
  viewport: LivingSceneViewport,
  elapsedSeconds: number,
  foreground: boolean,
) {
  const { x, y, scale } = placement
  if (y > viewport.height * 1.16) return
  const width = 34 * scale
  const height = 19 * scale
  const steering = clamp(car.laneVelocity * 0.9, -0.24, 0.24)
  const bounce = Math.sin(elapsedSeconds * 13 + car.phase) * scale * 0.45
  const color = `hsl(${car.hue} 88% 57%)`

  context.save()
  context.translate(x, y + bounce)
  context.rotate(steering + placement.curve / viewport.width * 0.28)

  context.fillStyle = `rgba(0,0,0,${foreground ? 0.44 : 0.3})`
  context.beginPath()
  context.ellipse(0, height * 0.58, width * 0.72, height * 0.32, 0, 0, TAU)
  context.fill()

  if (car.boost > 0) {
    context.save()
    context.globalCompositeOperation = 'screen'
    const trailLength = width * (1.5 + car.boost)
    const trail = context.createLinearGradient(0, 0, 0, trailLength)
    trail.addColorStop(0, `hsla(${car.hue} 100% 68% / 0.62)`)
    trail.addColorStop(1, `hsla(${car.hue} 100% 55% / 0)`)
    context.strokeStyle = trail
    context.lineWidth = Math.max(1, scale * 2.2)
    for (const offset of [-0.32, 0.32]) {
      context.beginPath()
      context.moveTo(width * offset, height * 0.34)
      context.lineTo(width * offset, height + trailLength)
      context.stroke()
    }
    context.restore()
  }

  context.fillStyle = '#070913'
  context.fillRect(-width * 0.61, height * 0.04, width * 0.2, height * 0.58)
  context.fillRect(width * 0.41, height * 0.04, width * 0.2, height * 0.58)

  const bodyGradient = context.createLinearGradient(-width * 0.45, -height * 0.5, width * 0.4, height * 0.6)
  bodyGradient.addColorStop(0, '#f8fbff')
  bodyGradient.addColorStop(0.16, color)
  bodyGradient.addColorStop(1, `hsl(${car.hue} 68% 24%)`)
  context.fillStyle = bodyGradient
  context.beginPath()
  context.moveTo(-width * 0.48, height * 0.46)
  context.lineTo(-width * 0.34, -height * 0.28)
  context.quadraticCurveTo(0, -height * 0.62, width * 0.34, -height * 0.28)
  context.lineTo(width * 0.51, height * 0.46)
  context.quadraticCurveTo(0, height * 0.78, -width * 0.48, height * 0.46)
  context.fill()

  context.fillStyle = 'rgba(5,12,27,0.82)'
  context.beginPath()
  context.moveTo(-width * 0.2, -height * 0.26)
  context.quadraticCurveTo(0, -height * 0.48, width * 0.2, -height * 0.26)
  context.lineTo(width * 0.13, height * 0.02)
  context.lineTo(-width * 0.13, height * 0.02)
  context.closePath()
  context.fill()

  context.save()
  context.globalCompositeOperation = 'screen'
  context.fillStyle = 'rgba(215,251,255,0.88)'
  for (const lightX of [-0.31, 0.31]) {
    context.beginPath()
    context.ellipse(width * lightX, height * 0.38, width * 0.1, height * 0.09, 0, 0, TAU)
    context.fill()
  }
  context.strokeStyle = `hsla(${car.hue} 100% 70% / 0.72)`
  context.lineWidth = Math.max(0.7, scale)
  context.beginPath()
  context.moveTo(-width * 0.33, height * 0.52)
  context.quadraticCurveTo(0, height * 0.7, width * 0.33, height * 0.52)
  context.stroke()
  context.restore()
  context.restore()
}

function drawFinishPulse(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  raceClock: number,
) {
  const pulse = Math.pow(Math.max(0, Math.sin(raceClock * 0.47)), 12)
  if (pulse < 0.01) return
  context.save()
  context.globalCompositeOperation = 'screen'
  context.fillStyle = `rgba(255,255,255,${pulse * 0.025})`
  context.fillRect(0, 0, viewport.width, viewport.height)
  context.restore()
}
