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
  viewportScale,
  wrap,
} from './scene-utils'

type Fleet = 0 | 1

type Starfighter = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  speed: number
  fleet: Fleet
  phase: number
  roll: number
  cooldown: number
  hitFlash: number
  depth: number
}

type LaserBolt = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  fleet: Fleet
  life: number
}

type SpaceExplosion = {
  x: number
  y: number
  age: number
  size: number
  phase: number
  fleet: Fleet
}

type StarTrail = {
  x: number
  y: number
  speed: number
  depth: number
  phase: number
}

const MAX_FIGHTERS = 10
const MAX_TRAILS = 74

export const starfighterBattleRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random, emitAudioEvent = () => undefined }) {
    let viewport = initialViewport
    let jumpFlash = 0
    let nextReinforcement = 4 + random() * 7
    let broadside = 0
    let nextBroadside = 7 + random() * 9

    const fighters: Starfighter[] = Array.from({ length: MAX_FIGHTERS }, (_, index) => {
      const fleet = index % 2 as Fleet
      return {
        x: fleet === 0 ? 0.12 + random() * 0.33 : 0.55 + random() * 0.35,
        y: 0.15 + random() * 0.67,
        velocityX: fleet === 0 ? 0.018 + random() * 0.025 : -0.018 - random() * 0.025,
        velocityY: (random() - 0.5) * 0.025,
        speed: 0.05 + random() * 0.035,
        fleet,
        phase: random() * TAU,
        roll: (random() - 0.5) * 0.5,
        cooldown: 0.6 + random() * 3.4,
        hitFlash: 0,
        depth: 0.55 + random() * 0.45,
      }
    })

    const bolts: LaserBolt[] = []
    const explosions: SpaceExplosion[] = []
    const trails: StarTrail[] = Array.from({ length: MAX_TRAILS }, () => ({
      x: random(),
      y: random(),
      speed: 0.025 + random() * 0.1,
      depth: 0.15 + random() * 0.85,
      phase: random() * TAU,
    }))

    function findTarget(fighter: Starfighter, activeFighters: Starfighter[]) {
      let target: Starfighter | null = null
      let targetDistance = Number.POSITIVE_INFINITY
      for (const candidate of activeFighters) {
        if (candidate.fleet === fighter.fleet) continue
        const deltaX = candidate.x - fighter.x
        const deltaY = candidate.y - fighter.y
        const distance = deltaX * deltaX + deltaY * deltaY
        if (distance < targetDistance) {
          target = candidate
          targetDistance = distance
        }
      }
      return target
    }

    function fire(fighter: Starfighter, target: Starfighter) {
      const deltaX = target.x - fighter.x
      const deltaY = target.y - fighter.y
      const distance = Math.max(0.001, Math.hypot(deltaX, deltaY))
      const boltSpeed = 0.48 + random() * 0.11
      bolts.push({
        x: fighter.x,
        y: fighter.y,
        velocityX: deltaX / distance * boltSpeed + fighter.velocityX * 0.3,
        velocityY: deltaY / distance * boltSpeed + fighter.velocityY * 0.3,
        fleet: fighter.fleet,
        life: 1.45,
      })
      fighter.cooldown = 1.1 + random() * 2.4
      emitAudioEvent({
        cue: 'laser',
        sourceId: `fighter-${fighters.indexOf(fighter)}`,
        x: clamp(fighter.x),
        intensity: 0.48 + fighter.depth * 0.38,
      })
    }

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.07)
        nextReinforcement -= delta
        nextBroadside -= delta
        jumpFlash = Math.max(0, jumpFlash - delta * 2.2)
        broadside = Math.max(0, broadside - delta * 0.42)

        const activeCount = getActiveCount(fighters.length, viewport, 5)
        const activeFighters = fighters.slice(0, activeCount)

        if (nextReinforcement <= 0) {
          const reinforcement = activeFighters[Math.floor(random() * activeFighters.length)]
          reinforcement.x = reinforcement.fleet === 0 ? -0.08 : 1.08
          reinforcement.y = 0.12 + random() * 0.72
          reinforcement.velocityX = reinforcement.fleet === 0 ? 0.06 : -0.06
          reinforcement.hitFlash = 0
          jumpFlash = 1
          nextReinforcement = 7 + random() * 11
          emitAudioEvent({
            cue: 'jump-in',
            sourceId: `fighter-${fighters.indexOf(reinforcement)}`,
            x: reinforcement.fleet === 0 ? 0.05 : 0.95,
            intensity: 0.76,
          })
        }
        if (nextBroadside <= 0) {
          broadside = 1
          nextBroadside = 10 + random() * 14
          emitAudioEvent({ cue: 'broadside', x: 0.5, intensity: 0.82 })
        }

        activeFighters.forEach((fighter) => {
          const target = findTarget(fighter, activeFighters)
          fighter.cooldown -= delta
          fighter.hitFlash = Math.max(0, fighter.hitFlash - delta * 3)

          if (target) {
            const deltaX = target.x - fighter.x
            const deltaY = target.y - fighter.y
            const distance = Math.max(0.01, Math.hypot(deltaX, deltaY))
            const orbit = Math.sin(fighter.phase + fighter.x * 5) * 0.016
            fighter.velocityX += (deltaX / distance * fighter.speed + orbit - fighter.velocityX) * delta * 0.34
            fighter.velocityY += (deltaY / distance * fighter.speed - fighter.velocityY) * delta * 0.28
            fighter.roll = lerp(fighter.roll, clamp(fighter.velocityY * 8, -0.6, 0.6), delta * 2.2)
            if (fighter.cooldown <= 0 && distance < 0.48) fire(fighter, target)
          }

          fighter.x += fighter.velocityX * delta
          fighter.y += fighter.velocityY * delta
          if (fighter.x < -0.14) fighter.x = 1.12
          else if (fighter.x > 1.14) fighter.x = -0.12
          if (fighter.y < 0.07) {
            fighter.y = 0.07
            fighter.velocityY = Math.abs(fighter.velocityY)
          } else if (fighter.y > 0.9) {
            fighter.y = 0.9
            fighter.velocityY = -Math.abs(fighter.velocityY)
          }
        })

        for (let index = bolts.length - 1; index >= 0; index -= 1) {
          const bolt = bolts[index]
          bolt.x += bolt.velocityX * delta
          bolt.y += bolt.velocityY * delta
          bolt.life -= delta
          const target = activeFighters.find((fighter) => fighter.fleet !== bolt.fleet
            && Math.hypot(fighter.x - bolt.x, fighter.y - bolt.y) < 0.028 * fighter.depth)
          if (target) {
            target.hitFlash = 1
            target.velocityY += (random() - 0.5) * 0.16
            explosions.push({
              x: bolt.x,
              y: bolt.y,
              age: 0,
              size: 0.6 + random() * 0.75,
              phase: random() * TAU,
              fleet: target.fleet,
            })
            emitAudioEvent({
              cue: 'impact',
              sourceId: `fighter-${fighters.indexOf(target)}`,
              x: clamp(bolt.x),
              intensity: 0.62 + target.depth * 0.34,
            })
            bolts.splice(index, 1)
          } else if (bolt.life <= 0 || bolt.x < -0.2 || bolt.x > 1.2 || bolt.y < -0.2 || bolt.y > 1.2) {
            bolts.splice(index, 1)
          }
        }

        for (let index = explosions.length - 1; index >= 0; index -= 1) {
          explosions[index].age += delta
          if (explosions[index].age > 0.85) explosions.splice(index, 1)
        }

        trails.forEach((trail) => {
          trail.x = wrap(trail.x - delta * trail.speed)
          trail.y = wrap(trail.y + Math.sin(trail.phase + trail.x * 8) * delta * 0.003)
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawSpaceMotion(context, viewport, trails, elapsedSeconds, jumpFlash)
        if (broadside > 0) drawDistantBroadside(context, viewport, broadside)

        bolts.forEach((bolt) => drawLaser(context, viewport, bolt))
        const activeCount = getActiveCount(fighters.length, viewport, 5)
        fighters
          .slice(0, activeCount)
          .sort((left, right) => left.depth - right.depth)
          .forEach((fighter) => drawStarfighter(context, viewport, fighter, elapsedSeconds))
        explosions.forEach((explosion) => drawExplosion(context, viewport, explosion))
      },
    }
  },
}

function drawSpaceMotion(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  trails: StarTrail[],
  elapsedSeconds: number,
  jumpFlash: number,
) {
  const activeTrails = getActiveCount(trails.length, viewport, 26)
  context.save()
  context.globalCompositeOperation = 'screen'
  trails.slice(0, activeTrails).forEach((trail, index) => {
    const x = trail.x * viewport.width
    const y = trail.y * viewport.height
    const tail = 3 + trail.depth * (10 + jumpFlash * 90)
    const alpha = 0.08 + trail.depth * 0.2 + jumpFlash * 0.18
    context.strokeStyle = index % 5 === 0
      ? `rgba(176,143,255,${alpha})`
      : `rgba(196,225,255,${alpha})`
    context.lineWidth = 0.45 + trail.depth * 0.75
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + tail, y + Math.sin(elapsedSeconds * 0.2 + trail.phase) * 1.5)
    context.stroke()
  })
  if (jumpFlash > 0) {
    context.fillStyle = `rgba(172,220,255,${jumpFlash * 0.045})`
    context.fillRect(0, 0, viewport.width, viewport.height)
  }
  context.restore()
}

function drawDistantBroadside(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  broadside: number,
) {
  const pulse = Math.sin(clamp(broadside) * Math.PI)
  const y = viewport.height * 0.2
  context.save()
  context.globalCompositeOperation = 'screen'
  for (let shot = 0; shot < 5; shot += 1) {
    const x = viewport.width * (0.12 + shot * 0.035)
    const endX = viewport.width * (0.56 + shot * 0.045)
    context.strokeStyle = shot % 2
      ? `rgba(255,91,173,${pulse * 0.22})`
      : `rgba(83,235,255,${pulse * 0.24})`
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, y + shot * 5)
    context.lineTo(endX, y + viewport.height * 0.08 + shot * 3)
    context.stroke()
  }
  context.restore()
}

function drawLaser(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  bolt: LaserBolt,
) {
  const x = bolt.x * viewport.width
  const y = bolt.y * viewport.height
  const directionLength = Math.max(0.001, Math.hypot(bolt.velocityX, bolt.velocityY))
  const tail = Math.min(viewport.width, viewport.height) * 0.035
  const endX = x - bolt.velocityX / directionLength * tail
  const endY = y - bolt.velocityY / directionLength * tail
  context.save()
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = bolt.fleet === 0 ? 'rgba(80,246,255,0.88)' : 'rgba(255,77,174,0.88)'
  context.lineWidth = 1.6
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(endX, endY)
  context.stroke()
  context.restore()
}

function drawStarfighter(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  fighter: Starfighter,
  elapsedSeconds: number,
) {
  const x = fighter.x * viewport.width
  const y = fighter.y * viewport.height
  const heading = Math.atan2(fighter.velocityY * viewport.height, fighter.velocityX * viewport.width)
  const scale = viewportScale(viewport) * fighter.depth
  const length = 31 * scale
  const fleetColor = fighter.fleet === 0 ? '#4af4ed' : '#ff4ca5'
  const bodyColor = fighter.fleet === 0 ? '#0a2029' : '#2a0c22'
  const enginePulse = 0.55 + Math.sin(elapsedSeconds * 8 + fighter.phase) * 0.18

  context.save()
  context.translate(x, y)
  context.rotate(heading)
  context.scale(1, Math.cos(fighter.roll) * 0.72 + 0.28)

  context.save()
  context.globalCompositeOperation = 'screen'
  const engine = context.createLinearGradient(-length * 0.4, 0, -length * 1.4, 0)
  engine.addColorStop(0, `${fleetColor}${Math.round(enginePulse * 210).toString(16).padStart(2, '0')}`)
  engine.addColorStop(1, `${fleetColor}00`)
  context.strokeStyle = engine
  context.lineWidth = 2.2 * scale
  context.beginPath()
  context.moveTo(-length * 0.36, 0)
  context.lineTo(-length * 1.35, 0)
  context.stroke()
  context.restore()

  context.fillStyle = bodyColor
  context.strokeStyle = fighter.hitFlash > 0 ? '#ffffff' : `${fleetColor}99`
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(length * 0.75, 0)
  context.lineTo(-length * 0.24, -length * 0.18)
  context.lineTo(-length * 0.58, -length * 0.54)
  context.lineTo(-length * 0.42, -length * 0.08)
  context.lineTo(-length * 0.42, length * 0.08)
  context.lineTo(-length * 0.58, length * 0.54)
  context.lineTo(-length * 0.24, length * 0.18)
  context.closePath()
  context.fill()
  context.stroke()

  context.fillStyle = 'rgba(202,240,255,0.58)'
  context.beginPath()
  context.ellipse(length * 0.14, 0, length * 0.18, length * 0.1, 0, 0, TAU)
  context.fill()
  context.restore()
}

function drawExplosion(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  explosion: SpaceExplosion,
) {
  const progress = clamp(explosion.age / 0.85)
  const alpha = 1 - progress
  const radius = (8 + progress * 42) * explosion.size * viewportScale(viewport)
  const x = explosion.x * viewport.width
  const y = explosion.y * viewport.height
  const color = explosion.fleet === 0 ? '83,245,239' : '255,78,166'

  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(context, x, y, radius, `rgba(255,241,193,${alpha * 0.66})`, `rgba(${color},0)`)
  context.strokeStyle = `rgba(${color},${alpha * 0.58})`
  context.lineWidth = Math.max(0.7, 2 * alpha)
  for (let ray = 0; ray < 9; ray += 1) {
    const angle = explosion.phase + ray / 9 * TAU
    const inner = radius * 0.16
    const outer = radius * (0.55 + ((ray * 37) % 10) / 20)
    context.beginPath()
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
    context.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
    context.stroke()
  }
  context.restore()
}
