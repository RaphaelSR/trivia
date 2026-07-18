import type { LivingSceneRenderer, LivingSceneViewport } from '../types'
import {
  TAU,
  clamp,
  drawRadialGlow,
  getActiveCount,
  smoothstep,
  viewportScale,
  wrap,
} from './scene-utils'

type SurfBand = {
  y: number
  phase: number
  speed: number
  amplitude: number
  alpha: number
  depth: number
}

type Ember = {
  x: number
  y: number
  speed: number
  drift: number
  phase: number
  size: number
}

type ShoreFoam = {
  x: number
  y: number
  speed: number
  phase: number
  size: number
  depth: number
}

type IslandBird = {
  progress: number
  altitude: number
  speed: number
  phase: number
  depth: number
  direction: 1 | -1
}

type CastawayRoutine = 'camp' | 'shore' | 'raft' | 'horizon'

type CastawayActor = {
  x: number
  targetX: number
  routine: CastawayRoutine
  wait: number
  facing: 1 | -1
  walkPhase: number
}

const MAX_EMBERS = 30
const MAX_FOAM = 42
const MAX_BIRDS = 8

const ROUTINE_X: Record<CastawayRoutine, number> = {
  camp: 0.32,
  shore: 0.58,
  raft: 0.79,
  horizon: 0.68,
}

export const castawayIslandRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random, emitAudioEvent = () => undefined }) {
    let viewport = initialViewport
    let fireBoost = 0
    let nextGust = 3 + random() * 5

    const surf: SurfBand[] = Array.from({ length: 7 }, (_, index) => ({
      y: 0.43 + index * 0.039,
      phase: random() * TAU,
      speed: 0.18 + index * 0.025 + random() * 0.04,
      amplitude: 0.003 + index * 0.0012,
      alpha: 0.045 + index * 0.009,
      depth: 0.3 + index / 9,
    }))

    const embers: Ember[] = Array.from({ length: MAX_EMBERS }, () => ({
      x: 0.282 + (random() - 0.5) * 0.012,
      y: 0.586 + random() * 0.035,
      speed: 0.018 + random() * 0.05,
      drift: (random() - 0.5) * 0.018,
      phase: random() * TAU,
      size: 0.5 + random() * 1.7,
    }))

    const foam: ShoreFoam[] = Array.from({ length: MAX_FOAM }, () => ({
      x: random(),
      y: random(),
      speed: 0.012 + random() * 0.035,
      phase: random() * TAU,
      size: 0.5 + random() * 2.2,
      depth: 0.2 + random() * 0.8,
    }))

    const birds: IslandBird[] = Array.from(
      { length: MAX_BIRDS },
      (_, index) => ({
        progress: wrap(index / MAX_BIRDS + random() * 0.17),
        altitude: 0.12 + random() * 0.25,
        speed: 0.008 + random() * 0.018,
        phase: random() * TAU,
        depth: 0.48 + random() * 0.52,
        direction: index % 3 === 0 ? -1 : 1,
      }),
    )

    const actor: CastawayActor = {
      x: ROUTINE_X.horizon,
      targetX: ROUTINE_X.horizon,
      routine: 'horizon',
      wait: 2 + random() * 3,
      facing: -1,
      walkPhase: random() * TAU,
    }

    function chooseRoutine() {
      const routines: CastawayRoutine[] = ['camp', 'shore', 'raft', 'horizon']
      const candidates = routines.filter((routine) => routine !== actor.routine)
      actor.routine = candidates[Math.floor(random() * candidates.length)]
      actor.targetX = ROUTINE_X[actor.routine]
      actor.facing = actor.targetX >= actor.x ? 1 : -1
      actor.wait = 2.5 + random() * 4.5
    }

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        nextGust -= delta
        fireBoost = Math.max(0, fireBoost - delta * 0.7)
        if (nextGust <= 0) {
          fireBoost = 0.55 + random() * 0.45
          nextGust = 6 + random() * 10
          emitAudioEvent({
            cue: 'fire-gust',
            x: 0.282,
            intensity: fireBoost,
          })
        }

        surf.forEach((band) => {
          band.phase = wrap(band.phase + delta * band.speed, TAU)
        })
        embers.forEach((ember) => {
          ember.y -= delta * ember.speed * (1 + fireBoost * 0.65)
          ember.x +=
            delta * (ember.drift + Math.sin(ember.phase + ember.y * 27) * 0.004)
          if (ember.y < 0.49) {
            ember.x = 0.282 + (random() - 0.5) * 0.014
            ember.y = 0.59 + random() * 0.025
            ember.speed = 0.018 + random() * 0.05
          }
        })
        foam.forEach((speck) => {
          speck.x = wrap(speck.x + delta * speck.speed)
          speck.y = wrap(speck.y + delta * speck.speed * 0.16)
        })
        birds.forEach((bird) => {
          bird.progress = wrap(
            bird.progress + delta * bird.speed * bird.direction,
          )
        })

        const distance = actor.targetX - actor.x
        if (Math.abs(distance) > 0.004) {
          const step =
            Math.sign(distance) * Math.min(Math.abs(distance), delta * 0.027)
          actor.x += step
          actor.walkPhase = wrap(actor.walkPhase + delta * 6.2, TAU)
        } else {
          actor.x = actor.targetX
          actor.wait -= delta
          if (actor.routine === 'camp') fireBoost = Math.max(fireBoost, 0.24)
          if (actor.wait <= 0) chooseRoutine()
        }
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawSunlitSurf(context, viewport, surf, foam, elapsedSeconds)
        drawCampfire(context, viewport, embers, elapsedSeconds, fireBoost)

        const activeBirds = getActiveCount(birds.length, viewport, 4)
        birds
          .slice(0, activeBirds)
          .sort((left, right) => left.depth - right.depth)
          .forEach((bird) => drawBird(context, viewport, bird, elapsedSeconds))

        drawCastaway(context, viewport, actor, elapsedSeconds)
      },
    }
  },
}

function drawSunlitSurf(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  surf: SurfBand[],
  foam: ShoreFoam[],
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  context.save()
  context.lineCap = 'round'
  context.globalCompositeOperation = 'screen'

  surf.forEach((band, index) => {
    const segments = 20
    context.strokeStyle =
      index % 3 === 0
        ? `rgba(255,239,202,${band.alpha})`
        : `rgba(210,245,238,${band.alpha})`
    context.lineWidth = 0.6 + band.depth * 1.2
    context.beginPath()
    for (let segment = 0; segment <= segments; segment += 1) {
      const progress = segment / segments
      const shoreSlope = progress > 0.72 ? (progress - 0.72) * 0.085 : 0
      const y =
        height *
        (band.y +
          shoreSlope +
          Math.sin(progress * TAU * (1.25 + index * 0.11) + band.phase) *
            band.amplitude)
      const x = progress * width
      if (segment === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.stroke()
  })

  const activeFoam = getActiveCount(foam.length, viewport, 16)
  foam.slice(0, activeFoam).forEach((speck) => {
    const travel = wrap(speck.x + elapsedSeconds * speck.speed * 0.04)
    const x = travel * width
    const baseY = 0.49 + travel * 0.09
    const y =
      height *
      (baseY + Math.sin(speck.phase + travel * 18) * 0.012 + speck.y * 0.035)
    const alpha = 0.035 + speck.depth * 0.08
    context.fillStyle = `rgba(238,250,238,${alpha})`
    context.beginPath()
    context.ellipse(
      x,
      y,
      speck.size * (1.2 + speck.depth),
      Math.max(0.45, speck.size * 0.35),
      0,
      0,
      TAU,
    )
    context.fill()
  })
  context.restore()
}

function drawCampfire(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  embers: Ember[],
  elapsedSeconds: number,
  fireBoost: number,
) {
  const { width, height } = viewport
  const originX = width * 0.282
  const originY = height * 0.603
  const scale = viewportScale(viewport)
  const pulse = 0.72 + Math.sin(elapsedSeconds * 7.3) * 0.16 + fireBoost * 0.32

  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(
    context,
    originX,
    originY,
    Math.min(width, height) * (0.09 + fireBoost * 0.03),
    `rgba(255,128,38,${0.065 + fireBoost * 0.045})`,
  )

  for (let flame = 0; flame < 3; flame += 1) {
    const offset = (flame - 1) * 4.5 * scale
    const flameHeight = (10 + flame * 3 + fireBoost * 7) * scale
    context.fillStyle =
      flame === 1
        ? `rgba(255,236,147,${0.18 * pulse})`
        : `rgba(255,107,36,${0.16 * pulse})`
    context.beginPath()
    context.moveTo(originX + offset - 3 * scale, originY)
    context.quadraticCurveTo(
      originX + offset + Math.sin(elapsedSeconds * 6 + flame) * 3 * scale,
      originY - flameHeight,
      originX + offset + 3 * scale,
      originY,
    )
    context.closePath()
    context.fill()
  }

  const activeEmbers = getActiveCount(embers.length, viewport, 12)
  embers.slice(0, activeEmbers).forEach((ember, index) => {
    const fade = clamp((ember.y - 0.48) / 0.12)
    context.fillStyle =
      index % 3 === 0
        ? `rgba(255,232,151,${fade * 0.54})`
        : `rgba(255,113,43,${fade * 0.42})`
    context.beginPath()
    context.arc(ember.x * width, ember.y * height, ember.size * scale, 0, TAU)
    context.fill()
  })
  context.restore()
}

function drawBird(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  bird: IslandBird,
  elapsedSeconds: number,
) {
  const progress = bird.direction === 1 ? bird.progress : 1 - bird.progress
  const x = progress * viewport.width
  const y =
    viewport.height *
    (bird.altitude + Math.sin(elapsedSeconds * 0.17 + bird.phase) * 0.024)
  const scale = viewportScale(viewport) * bird.depth
  const flap = Math.sin(elapsedSeconds * 3.1 + bird.phase) * 3.5 * scale

  context.save()
  context.translate(x, y)
  context.scale(bird.direction, 1)
  context.strokeStyle = `rgba(25,25,19,${0.32 + bird.depth * 0.34})`
  context.lineWidth = 1.1 * scale
  context.beginPath()
  context.moveTo(-8 * scale, flap)
  context.quadraticCurveTo(-4 * scale, -flap, 0, 0)
  context.quadraticCurveTo(4 * scale, -flap, 8 * scale, flap)
  context.stroke()
  context.restore()
}

function beachYAt(x: number) {
  return 0.605 + Math.max(0, x - 0.3) * 0.13
}

function drawCastaway(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  actor: CastawayActor,
  elapsedSeconds: number,
) {
  const distance = Math.abs(actor.targetX - actor.x)
  const walking = distance > 0.004
  const scale = viewportScale(viewport) * 0.84
  const x = actor.x * viewport.width
  const groundY = beachYAt(actor.x) * viewport.height
  const walk = walking ? Math.sin(actor.walkPhase) : 0
  const activity = walking
    ? 0
    : smoothstep(0.5 + Math.sin(elapsedSeconds * 0.42) * 0.5)

  context.save()
  context.translate(x, groundY)
  context.scale(actor.facing, 1)
  context.strokeStyle = 'rgba(20,16,12,0.64)'
  context.fillStyle = 'rgba(18,14,11,0.68)'
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = 2.2 * scale

  let crouch = 0
  let armReach = 0
  if (!walking) {
    if (actor.routine === 'camp' || actor.routine === 'shore') {
      crouch = actor.routine === 'shore' ? 5 * scale : 3 * scale
      armReach = 5 * activity
    } else if (actor.routine === 'raft') {
      crouch = 2 * scale
      armReach = 8 * activity
    }
  }

  const hipY = -10 * scale + crouch
  const shoulderY = -21 * scale + crouch
  context.beginPath()
  context.arc(0, -27 * scale + crouch, 3.6 * scale, 0, TAU)
  context.fill()
  context.beginPath()
  context.moveTo(0, -23 * scale + crouch)
  context.lineTo(0, hipY)
  context.moveTo(0, shoulderY)
  if (!walking && actor.routine === 'horizon') {
    context.lineTo(8 * scale, -27 * scale)
    context.lineTo(12 * scale, -26 * scale)
  } else {
    context.lineTo((5 + armReach) * scale, -13 * scale + crouch + walk * scale)
  }
  context.moveTo(0, shoulderY)
  context.lineTo(-5 * scale, -14 * scale + crouch - walk * scale)
  context.moveTo(0, hipY)
  context.lineTo(5 * scale, walk * 3 * scale)
  context.moveTo(0, hipY)
  context.lineTo(-5 * scale, -walk * 3 * scale)
  context.stroke()

  context.strokeStyle = 'rgba(241,174,84,0.2)'
  context.lineWidth = 0.8 * scale
  context.beginPath()
  context.moveTo(-1 * scale, -23 * scale + crouch)
  context.lineTo(-1 * scale, hipY)
  context.stroke()
  context.restore()
}
