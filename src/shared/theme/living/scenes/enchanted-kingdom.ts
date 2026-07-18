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

type SkyDrake = {
  progress: number
  altitude: number
  speed: number
  phase: number
  depth: number
  direction: 1 | -1
}

type FloatingLantern = {
  x: number
  y: number
  speed: number
  phase: number
  size: number
  hue: number
}

type MagicMote = {
  angle: number
  radius: number
  speed: number
  phase: number
  size: number
}

const MAX_DRAKES = 4
const MAX_LANTERNS = 42
const MAX_MOTES = 36

export const enchantedKingdomRenderer: LivingSceneRenderer = {
  create({ viewport: initialViewport, random, emitAudioEvent = () => undefined }) {
    let viewport = initialViewport
    let spell = 0
    let nextSpell = 2.5 + random() * 5
    let comet = -1
    let cometAudioPlayed = false
    let nextComet = 6 + random() * 9
    let procession = random()

    const drakes: SkyDrake[] = Array.from({ length: MAX_DRAKES }, (_, index) => ({
      progress: wrap(index / MAX_DRAKES + random() * 0.18),
      altitude: 0.15 + random() * 0.34,
      speed: 0.009 + random() * 0.016,
      phase: random() * TAU,
      depth: 0.45 + random() * 0.55,
      direction: index % 2 === 0 ? 1 : -1,
    }))

    const lanterns: FloatingLantern[] = Array.from({ length: MAX_LANTERNS }, (_, index) => ({
      x: random(),
      y: random(),
      speed: 0.009 + random() * 0.027,
      phase: random() * TAU,
      size: 1.4 + random() * 3.8,
      hue: index % 5 === 0 ? 170 : index % 3 === 0 ? 290 : 42,
    }))

    const motes: MagicMote[] = Array.from({ length: MAX_MOTES }, () => ({
      angle: random() * TAU,
      radius: 0.03 + random() * 0.18,
      speed: 0.1 + random() * 0.38,
      phase: random() * TAU,
      size: 0.7 + random() * 2.2,
    }))

    return {
      resize(nextViewport) {
        viewport = nextViewport
      },

      update(deltaSeconds) {
        const delta = Math.min(deltaSeconds, 0.08)
        nextSpell -= delta
        nextComet -= delta
        spell = Math.max(0, spell - delta * 0.24)
        procession = wrap(procession + delta * 0.018)

        if (nextSpell <= 0) {
          spell = 1
          nextSpell = 7 + random() * 10
          emitAudioEvent({ cue: 'magic', x: 0.72, intensity: 0.72 })
        }
        if (nextComet <= 0 && comet < 0) {
          comet = 0
          cometAudioPlayed = false
          nextComet = 10 + random() * 14
        }
        if (comet >= 0) {
          const previousComet = comet
          comet += delta * 0.22
          if (!cometAudioPlayed && previousComet < 0.19 && comet >= 0.19) {
            cometAudioPlayed = true
            emitAudioEvent({ cue: 'flyby', x: 0.95, intensity: 0.58 })
          }
          if (comet > 1.25) comet = -1
        }

        drakes.forEach((drake) => {
          drake.progress = wrap(drake.progress + delta * drake.speed * drake.direction)
        })
        lanterns.forEach((lantern) => {
          lantern.y -= delta * lantern.speed
          lantern.x += Math.sin(lantern.phase + lantern.y * 8) * delta * 0.006
          if (lantern.y < -0.08) {
            lantern.y = 1.06
            lantern.x = random()
          }
        })
        motes.forEach((mote) => {
          mote.angle = wrap(mote.angle + delta * mote.speed, TAU)
        })
      },

      render(context, nextViewport, elapsedSeconds) {
        viewport = nextViewport
        drawEnchantedSky(context, viewport, lanterns, elapsedSeconds)
        if (comet >= 0) drawComet(context, viewport, comet)
        drawTowerMagic(context, viewport, motes, spell, elapsedSeconds)

        const activeDrakes = getActiveCount(drakes.length, viewport, 2)
        drakes
          .slice(0, activeDrakes)
          .sort((left, right) => left.depth - right.depth)
          .forEach((drake) => drawDrake(context, viewport, drake, elapsedSeconds))

        drawRoyalProcession(context, viewport, procession, elapsedSeconds)
        drawForegroundFireflies(context, viewport, motes, elapsedSeconds)
      },
    }
  },
}

function drawEnchantedSky(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  lanterns: FloatingLantern[],
  elapsedSeconds: number,
) {
  const { width, height } = viewport
  context.save()
  context.globalCompositeOperation = 'screen'
  const ribbon = context.createLinearGradient(0, height * 0.08, width, height * 0.55)
  ribbon.addColorStop(0, 'rgba(77,246,207,0)')
  ribbon.addColorStop(0.38, 'rgba(77,246,207,0.045)')
  ribbon.addColorStop(0.64, 'rgba(194,111,255,0.055)')
  ribbon.addColorStop(1, 'rgba(194,111,255,0)')
  context.strokeStyle = ribbon
  context.lineWidth = height * 0.1
  context.beginPath()
  context.moveTo(-width * 0.08, height * 0.24)
  context.bezierCurveTo(
    width * 0.24,
    height * (0.04 + Math.sin(elapsedSeconds * 0.08) * 0.02),
    width * 0.62,
    height * 0.42,
    width * 1.08,
    height * 0.16,
  )
  context.stroke()

  const activeLanterns = getActiveCount(lanterns.length, viewport, 16)
  lanterns.slice(0, activeLanterns).forEach((lantern, index) => {
    const x = lantern.x * width + Math.sin(elapsedSeconds * 0.3 + lantern.phase) * 7
    const y = lantern.y * height
    const alpha = 0.24 + Math.sin(elapsedSeconds * 1.2 + lantern.phase) * 0.1
    if (index % 4 === 0) {
      drawRadialGlow(context, x, y, lantern.size * 6, `hsla(${lantern.hue} 100% 68% / ${alpha * 0.22})`)
    }
    context.fillStyle = `hsla(${lantern.hue} 92% 70% / ${alpha})`
    context.beginPath()
    context.ellipse(x, y, lantern.size * 0.7, lantern.size, 0, 0, TAU)
    context.fill()
  })
  context.restore()
}

function drawComet(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  comet: number,
) {
  const progress = smoothstep(clamp(comet))
  const x = lerp(viewport.width * 1.12, viewport.width * -0.12, progress)
  const y = lerp(viewport.height * 0.07, viewport.height * 0.46, progress)
  const trail = Math.min(viewport.width * 0.18, 220)
  context.save()
  context.globalCompositeOperation = 'screen'
  const gradient = context.createLinearGradient(x, y, x + trail, y - trail * 0.31)
  gradient.addColorStop(0, 'rgba(255,246,200,0.88)')
  gradient.addColorStop(0.16, 'rgba(147,236,255,0.48)')
  gradient.addColorStop(1, 'rgba(147,236,255,0)')
  context.strokeStyle = gradient
  context.lineWidth = 2.2
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x + trail, y - trail * 0.31)
  context.stroke()
  drawRadialGlow(context, x, y, 18, 'rgba(255,249,220,0.45)')
  context.restore()
}

function drawTowerMagic(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  motes: MagicMote[],
  spell: number,
  elapsedSeconds: number,
) {
  const originX = viewport.width * 0.72
  const originY = viewport.height * 0.43
  const minDimension = Math.min(viewport.width, viewport.height)
  const bloom = Math.sin(clamp(spell) * Math.PI)

  context.save()
  context.globalCompositeOperation = 'screen'
  drawRadialGlow(
    context,
    originX,
    originY,
    minDimension * (0.09 + bloom * 0.14),
    `rgba(133,255,222,${0.08 + bloom * 0.19})`,
  )
  if (bloom > 0.05) {
    context.strokeStyle = `rgba(171,252,231,${bloom * 0.24})`
    context.lineWidth = 1.2
    for (let ring = 1; ring <= 3; ring += 1) {
      context.beginPath()
      context.ellipse(
        originX,
        originY,
        minDimension * bloom * 0.08 * ring,
        minDimension * bloom * 0.025 * ring,
        elapsedSeconds * 0.08 + ring,
        0,
        TAU,
      )
      context.stroke()
    }
  }

  const activeMotes = getActiveCount(motes.length, viewport, 14)
  motes.slice(0, activeMotes).forEach((mote, index) => {
    const radius = mote.radius * minDimension * (0.55 + bloom * 0.7)
    const x = originX + Math.cos(mote.angle + mote.phase) * radius
    const y = originY + Math.sin(mote.angle * 0.72 + mote.phase) * radius * 0.55
    context.fillStyle = index % 3 === 0
      ? `rgba(204,151,255,${0.16 + bloom * 0.22})`
      : `rgba(122,255,219,${0.14 + bloom * 0.2})`
    context.beginPath()
    context.arc(x, y, mote.size, 0, TAU)
    context.fill()
  })
  context.restore()
}

function drawDrake(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  drake: SkyDrake,
  elapsedSeconds: number,
) {
  const direction = drake.direction
  const x = drake.progress * viewport.width
  const y = viewport.height * (drake.altitude + Math.sin(elapsedSeconds * 0.18 + drake.phase) * 0.035)
  const scale = viewportScale(viewport) * drake.depth
  const wing = 0.45 + Math.sin(elapsedSeconds * (2.1 + drake.speed * 20) + drake.phase) * 0.45
  const bodyLength = 42 * scale

  context.save()
  context.translate(x, y)
  context.scale(direction, 1)
  context.rotate(Math.sin(elapsedSeconds * 0.16 + drake.phase) * 0.08)
  context.fillStyle = `rgba(7,10,19,${0.42 + drake.depth * 0.34})`
  context.beginPath()
  context.moveTo(-bodyLength * 0.65, 0)
  context.quadraticCurveTo(-bodyLength * 0.15, -bodyLength * 0.1, bodyLength * 0.42, 0)
  context.lineTo(bodyLength * 0.72, -bodyLength * 0.12)
  context.lineTo(bodyLength * 0.55, bodyLength * 0.09)
  context.quadraticCurveTo(-bodyLength * 0.2, bodyLength * 0.18, -bodyLength * 0.65, 0)
  context.fill()

  context.beginPath()
  context.moveTo(-bodyLength * 0.12, -bodyLength * 0.03)
  context.quadraticCurveTo(-bodyLength * 0.35, -bodyLength * (0.45 + wing * 0.45), -bodyLength * 0.95, -bodyLength * (0.24 + wing * 0.18))
  context.quadraticCurveTo(-bodyLength * 0.5, bodyLength * 0.02, -bodyLength * 0.08, bodyLength * 0.08)
  context.fill()
  context.beginPath()
  context.moveTo(bodyLength * 0.08, 0)
  context.quadraticCurveTo(bodyLength * 0.23, -bodyLength * (0.4 + wing * 0.38), bodyLength * 0.76, -bodyLength * (0.2 + wing * 0.14))
  context.quadraticCurveTo(bodyLength * 0.47, bodyLength * 0.05, bodyLength * 0.06, bodyLength * 0.09)
  context.fill()
  context.strokeStyle = 'rgba(118,252,222,0.2)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(-bodyLength * 0.7, 0)
  context.quadraticCurveTo(-bodyLength * 1.2, bodyLength * 0.12, -bodyLength * 1.45, -bodyLength * 0.05)
  context.stroke()
  context.restore()
}

function drawRoyalProcession(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  procession: number,
  elapsedSeconds: number,
) {
  const routeStart = -0.12
  const routeEnd = 1.12
  const scale = viewportScale(viewport)
  for (let rider = 0; rider < 4; rider += 1) {
    const progress = wrap(procession - rider * 0.055)
    const x = lerp(routeStart, routeEnd, progress) * viewport.width
    const y = viewport.height * (0.82 + Math.sin(progress * Math.PI) * 0.025)
    const bob = Math.sin(elapsedSeconds * 5 + rider) * 1.5 * scale
    context.save()
    context.translate(x, y + bob)
    context.fillStyle = 'rgba(7,12,18,0.62)'
    context.beginPath()
    context.ellipse(0, 0, 12 * scale, 5 * scale, 0, 0, TAU)
    context.fill()
    context.fillRect(-2 * scale, -15 * scale, 4 * scale, 14 * scale)
    context.fillStyle = rider === 0 ? 'rgba(255,217,113,0.72)' : 'rgba(112,234,212,0.52)'
    context.fillRect(-1 * scale, -20 * scale, 2 * scale, 8 * scale)
    context.restore()
  }
}

function drawForegroundFireflies(
  context: CanvasRenderingContext2D,
  viewport: LivingSceneViewport,
  motes: MagicMote[],
  elapsedSeconds: number,
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  const count = getActiveCount(Math.min(18, motes.length), viewport, 8)
  motes.slice(0, count).forEach((mote, index) => {
    const x = wrap(mote.phase / TAU + elapsedSeconds * mote.speed * 0.003) * viewport.width
    const y = viewport.height * (0.62 + (mote.radius / 0.21) * 0.36 + Math.sin(elapsedSeconds + mote.phase) * 0.02)
    context.fillStyle = index % 2 ? 'rgba(137,255,208,0.28)' : 'rgba(255,222,122,0.3)'
    context.beginPath()
    context.arc(x, y, 1 + mote.size * 0.45, 0, TAU)
    context.fill()
  })
  context.restore()
}
