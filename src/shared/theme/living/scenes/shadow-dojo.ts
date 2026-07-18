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

type FighterAction = 'idle' | 'advance' | 'strike' | 'block' | 'leap' | 'sweep'

type DojoFighter = {
  homeX: number
  x: number
  targetX: number
  facing: 1 | -1
  action: FighterAction
  actionElapsed: number
  actionDuration: number
  phase: number
  primary: string
  glow: string
  stature: number
}

type DojoParticle = {
  x: number
  y: number
  speed: number
  drift: number
  phase: number
  depth: number
}

const FIGHTER_COLORS = [
  ['#102934', '#5ff5e2'],
  ['#32191e', '#ffb24d'],
  ['#221836', '#b89aff'],
] as const

export const shadowDojoRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random }) {
    let viewport = initialViewport
    let exchangeTimer = 1.5 + random() * 2
    let lightningTimer = 6 + random() * 8
    let lightning = 0

    const fighters: DojoFighter[] = [0.3, 0.69, 0.51].map((homeX, index) => ({
      homeX,
      x: homeX,
      targetX: homeX,
      facing: index === 1 ? -1 : 1,
      action: 'idle',
      actionElapsed: random() * 1.4,
      actionDuration: 1.7 + random(),
      phase: random() * TAU,
      primary: FIGHTER_COLORS[index][0],
      glow: FIGHTER_COLORS[index][1],
      stature: 0.9 + random() * 0.18,
    }))

    const rain: DojoParticle[] = Array.from({ length: 58 }, () => ({
      x: random(),
      y: random(),
      speed: 0.22 + random() * 0.52,
      drift: -0.025 - random() * 0.035,
      phase: random() * TAU,
      depth: 0.2 + random() * 0.8,
    }))

    const embers: DojoParticle[] = Array.from({ length: 28 }, () => ({
      x: random(),
      y: 0.62 + random() * 0.38,
      speed: 0.018 + random() * 0.04,
      drift: (random() - 0.5) * 0.025,
      phase: random() * TAU,
      depth: 0.2 + random() * 0.8,
    }))

    function setAction(fighter: DojoFighter, action: FighterAction, duration: number) {
      fighter.action = action
      fighter.actionElapsed = 0
      fighter.actionDuration = duration
    }

    function beginExchange() {
      const activeCount = getActiveCount(fighters.length, viewport, 2)
      const attackerIndex = Math.floor(random() * Math.min(2, activeCount))
      const defenderIndex = attackerIndex === 0 ? 1 : 0
      const attacker = fighters[attackerIndex]
      const defender = fighters[defenderIndex]
      const dramatic = random()

      attacker.facing = attacker.x < defender.x ? 1 : -1
      defender.facing = -attacker.facing as 1 | -1
      attacker.targetX = defender.homeX - attacker.facing * (dramatic > 0.62 ? 0.12 : 0.17)
      defender.targetX = defender.homeX

      if (dramatic > 0.72) {
        setAction(attacker, 'leap', 1.25)
        setAction(defender, 'block', 1.25)
      } else if (dramatic > 0.36) {
        setAction(attacker, 'strike', 0.95)
        setAction(defender, 'block', 0.95)
      } else {
        setAction(attacker, 'sweep', 1.1)
        setAction(defender, 'leap', 1.1)
      }

      if (activeCount > 2) {
        const observer = fighters[2]
        observer.targetX = observer.homeX + (random() - 0.5) * 0.08
        setAction(observer, random() > 0.55 ? 'advance' : 'idle', 1.6)
      }
      exchangeTimer = 2.6 + random() * 3.2
    }

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        exchangeTimer -= delta
        lightningTimer -= delta
        lightning = Math.max(0, lightning - delta * 2.8)
        if (exchangeTimer <= 0) beginExchange()
        if (lightningTimer <= 0) {
          lightning = 1
          lightningTimer = 8 + random() * 12
        }

        fighters.forEach((fighter) => {
          fighter.actionElapsed += delta
          const actionProgress = clamp(fighter.actionElapsed / fighter.actionDuration)
          const approach = fighter.action === 'strike' || fighter.action === 'sweep' || fighter.action === 'leap'
            ? Math.sin(actionProgress * Math.PI)
            : smoothstep(actionProgress)
          fighter.x = lerp(fighter.x, lerp(fighter.homeX, fighter.targetX, approach), 1 - Math.pow(0.02, delta))

          if (actionProgress >= 1) {
            fighter.targetX = fighter.homeX
            setAction(fighter, 'idle', 1.8 + random() * 1.8)
          }
        })

        rain.forEach((drop) => {
          drop.y = wrap(drop.y + delta * drop.speed)
          drop.x = wrap(drop.x + delta * drop.drift)
        })
        embers.forEach((ember) => {
          ember.y -= delta * ember.speed
          ember.x += delta * (ember.drift + Math.sin(ember.phase + ember.y * 8) * 0.004)
          if (ember.y < 0.54) {
            ember.y = 1.03
            ember.x = random()
          }
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawDojoAtmosphere(context, viewport, rain, embers, elapsedSeconds, lightning)
        drawDojoFloor(context, viewport, elapsedSeconds)

        const activeCount = getActiveCount(fighters.length, viewport, 2)
        fighters
          .slice(0, activeCount)
          .sort((left, right) => left.x - right.x)
          .forEach((fighter) => drawFighter(context, viewport, fighter, elapsedSeconds))

        drawForegroundMist(context, viewport, elapsedSeconds)
      },
    }
  },
}

function drawDojoAtmosphere(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  rain: DojoParticle[],
  embers: DojoParticle[],
  elapsedSeconds: number,
  lightning: number,
) {
  const { width, height } = viewport
  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(context, width * 0.16, height * 0.27, Math.min(width, height) * 0.24, 'rgba(255,130,47,0.105)')
  drawRadialGlow(context, width * 0.84, height * 0.27, Math.min(width, height) * 0.24, 'rgba(74,225,255,0.09)')

  const activeRain = getActiveCount(rain.length, viewport, 20)
  rain.slice(0, activeRain).forEach((drop) => {
    const x = drop.x * width
    const y = drop.y * height
    context.strokeStyle = `rgba(190,224,237,${0.025 + drop.depth * 0.07})`
    context.lineWidth = 0.4 + drop.depth * 0.65
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - 7 * drop.depth, y + 20 + 17 * drop.depth)
    context.stroke()
  })

  const activeEmbers = getActiveCount(embers.length, viewport, 10)
  embers.slice(0, activeEmbers).forEach((ember, index) => {
    const pulse = 0.35 + Math.sin(elapsedSeconds * 2.4 + ember.phase) * 0.2
    context.fillStyle = index % 3 === 0
      ? `rgba(94,244,230,${pulse})`
      : `rgba(255,157,66,${pulse})`
    context.beginPath()
    context.arc(ember.x * width, ember.y * height, 0.7 + ember.depth * 1.4, 0, TAU)
    context.fill()
  })
  context.restore()

  if (lightning > 0) {
    context.fillStyle = `rgba(194,225,255,${lightning * 0.055})`
    context.fillRect(0, 0, width, height)
  }
}

function drawDojoFloor(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  const horizon = height * 0.68
  context.save()
  const gradient = context.createLinearGradient(0, horizon, 0, height)
  gradient.addColorStop(0, 'rgba(3,8,13,0.08)')
  gradient.addColorStop(1, 'rgba(2,5,9,0.52)')
  context.fillStyle = gradient
  context.beginPath()
  context.moveTo(0, horizon)
  context.lineTo(width, horizon)
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.closePath()
  context.fill()

  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgba(113,213,218,0.055)'
  context.lineWidth = 1
  for (let line = -5; line <= 5; line += 1) {
    context.beginPath()
    context.moveTo(width * 0.5 + line * width * 0.018, horizon)
    context.lineTo(width * 0.5 + line * width * 0.19, height)
    context.stroke()
  }
  context.strokeStyle = `rgba(255,170,78,${0.035 + Math.sin(elapsedSeconds * 0.7) * 0.012})`
  for (let row = 1; row <= 5; row += 1) {
    const amount = row / 5
    const y = lerp(horizon, height, amount * amount)
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
  context.restore()
}

function drawFighter(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  fighter: DojoFighter,
  elapsedSeconds: number,
) {
  const progress = clamp(fighter.actionElapsed / fighter.actionDuration)
  const actionPulse = Math.sin(progress * Math.PI)
  const baseScale = viewportScale(viewport) * fighter.stature
  const x = fighter.x * viewport.width
  let y = viewport.height * 0.77
  let torsoLean = Math.sin(elapsedSeconds * 1.2 + fighter.phase) * 0.025
  let frontArm = 0.72
  let rearArm = 2.42
  let frontLeg = 1.24
  let rearLeg = 1.9

  if (fighter.action === 'strike') {
    torsoLean += fighter.facing * actionPulse * 0.18
    frontArm = lerp(0.72, 0.03, actionPulse)
    rearArm = lerp(2.42, 2.78, actionPulse)
  } else if (fighter.action === 'block') {
    frontArm = lerp(0.72, -1.02, actionPulse)
    rearArm = lerp(2.42, -2.12, actionPulse)
    torsoLean -= fighter.facing * actionPulse * 0.08
  } else if (fighter.action === 'leap') {
    y -= actionPulse * 72 * baseScale
    frontLeg = lerp(1.24, 0.48, actionPulse)
    rearLeg = lerp(1.9, 2.48, actionPulse)
    frontArm = lerp(0.72, -0.72, actionPulse)
  } else if (fighter.action === 'sweep') {
    y += actionPulse * 15 * baseScale
    torsoLean += fighter.facing * actionPulse * 0.35
    frontLeg = lerp(1.24, 0.08, actionPulse)
    rearLeg = lerp(1.9, 1.62, actionPulse)
  } else if (fighter.action === 'advance') {
    frontArm += Math.sin(progress * Math.PI * 4) * 0.2
    frontLeg += Math.sin(progress * Math.PI * 4) * 0.34
  }

  const bodyHeight = 74 * baseScale
  const shoulderY = -bodyHeight * 0.58
  const hipY = -bodyHeight * 0.14
  const headY = -bodyHeight * 0.82

  context.save()
  context.translate(x, y)
  context.scale(fighter.facing, 1)
  context.rotate(torsoLean)

  context.fillStyle = 'rgba(0,0,0,0.46)'
  context.beginPath()
  context.ellipse(0, 4, 37 * baseScale, 8 * baseScale, 0, 0, TAU)
  context.fill()

  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(context, 0, shoulderY * 0.7, 48 * baseScale, `${fighter.glow}14`)
  context.restore()

  context.strokeStyle = fighter.primary
  context.lineWidth = 12 * baseScale
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  context.moveTo(-3 * baseScale, shoulderY)
  context.lineTo(2 * baseScale, hipY)
  context.stroke()

  drawLimb(context, 0, shoulderY, 48 * baseScale, frontArm, fighter.primary, 8 * baseScale)
  drawLimb(context, -2 * baseScale, shoulderY + 4 * baseScale, 42 * baseScale, rearArm, fighter.primary, 7 * baseScale)
  drawLimb(context, 2 * baseScale, hipY, 55 * baseScale, frontLeg, fighter.primary, 10 * baseScale)
  drawLimb(context, -3 * baseScale, hipY, 53 * baseScale, rearLeg, fighter.primary, 9 * baseScale)

  context.fillStyle = fighter.primary
  context.beginPath()
  context.arc(0, headY, 12 * baseScale, 0, TAU)
  context.fill()
  context.strokeStyle = fighter.glow
  context.lineWidth = 1.5 * baseScale
  context.beginPath()
  context.moveTo(-8 * baseScale, headY - 2 * baseScale)
  context.lineTo(8 * baseScale, headY - 2 * baseScale)
  context.stroke()

  context.fillStyle = fighter.glow
  context.fillRect(-13 * baseScale, hipY - 4 * baseScale, 26 * baseScale, 3 * baseScale)
  context.restore()
}

function drawLimb(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  color: string,
  width: number,
) {
  const elbowX = x + Math.cos(angle) * length * 0.54
  const elbowY = y + Math.sin(angle) * length * 0.54
  const handX = elbowX + Math.cos(angle * 0.7) * length * 0.46
  const handY = elbowY + Math.sin(angle * 0.7) * length * 0.46
  context.strokeStyle = color
  context.lineWidth = width
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(elbowX, elbowY)
  context.lineTo(handX, handY)
  context.stroke()
}

function drawForegroundMist(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  elapsedSeconds: number,
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  for (let index = 0; index < 4; index += 1) {
    const x = viewport.width * (wrap(index * 0.29 + elapsedSeconds * (0.004 + index * 0.001)) - 0.08)
    const y = viewport.height * (0.82 + index * 0.045)
    drawRadialGlow(context, x, y, viewport.width * 0.24, 'rgba(159,190,201,0.025)')
  }
  context.restore()
}
