import { useEffect, useRef } from 'react'
import type { ThemeMode } from '@/shared/types/game'

export type LivingTheme = Extract<
  ThemeMode,
  | 'world-cup-2026'
  | 'kawaii'
  | 'neon-city'
  | 'storybook'
  | 'web-city'
  | 'deep-space'
  | 'midnight-cinema'
  | 'underwater'
>

type Particle = {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  depth: number
}

type SceneData = {
  particles: Particle[]
  secondary: Particle[]
  seed: number
}

const FULL_SCENES = new Set<LivingTheme>([
  'web-city',
  'deep-space',
  'midnight-cinema',
  'underwater',
])

const THEME_SEEDS: Record<LivingTheme, number> = {
  'world-cup-2026': 2026,
  kawaii: 711,
  'neon-city': 404,
  storybook: 812,
  'web-city': 616,
  'deep-space': 9001,
  'midnight-cinema': 1313,
  underwater: 20200,
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function createParticles(count: number, random: () => number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    size: 0.45 + random() * 1.9,
    speed: 0.15 + random() * 0.85,
    phase: random() * Math.PI * 2,
    depth: 0.28 + random() * 0.72,
  }))
}

function createSceneData(theme: LivingTheme, width: number): SceneData {
  const random = seededRandom(THEME_SEEDS[theme])
  const density = width < 640 ? 0.58 : width < 1100 ? 0.78 : 1
  return {
    particles: createParticles(Math.round(90 * density), random),
    secondary: createParticles(Math.round(38 * density), random),
    seed: THEME_SEEDS[theme],
  }
}

export function LivingThemeCanvas({ theme }: { theme: LivingTheme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) return
    const context: CanvasRenderingContext2D = canvasContext

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduceMotion = motionQuery.matches
    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = 1
    let data = createSceneData(theme, width)
    let frameId = 0
    let lastFrame = -Infinity
    let disposed = false

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas!.width = Math.max(1, Math.floor(width * dpr))
      canvas!.height = Math.max(1, Math.floor(height * dpr))
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      data = createSceneData(theme, width)
      if (reduceMotion) draw(0)
    }

    function draw(timeMs: number) {
      const time = timeMs / 1000
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      renderScene(context, theme, width, height, time, data)
    }

    function animate(timeMs: number) {
      if (disposed || document.hidden) return
      if (timeMs - lastFrame >= 1000 / 30) {
        draw(timeMs)
        lastFrame = timeMs
      }
      frameId = requestAnimationFrame(animate)
    }

    function start() {
      cancelAnimationFrame(frameId)
      if (disposed || document.hidden) return
      if (reduceMotion) draw(0)
      else frameId = requestAnimationFrame(animate)
    }

    function handleVisibility() {
      if (document.hidden) cancelAnimationFrame(frameId)
      else start()
    }

    function handleMotionChange(event: MediaQueryListEvent) {
      reduceMotion = event.matches
      start()
    }

    resize()
    start()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery.addEventListener('change', handleMotionChange)

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      data-living-scene={theme}
      className={FULL_SCENES.has(theme) ? 'absolute inset-0 h-full w-full' : 'absolute inset-0 z-[2] h-full w-full'}
    />
  )
}

function renderScene(
  context: CanvasRenderingContext2D,
  theme: LivingTheme,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  switch (theme) {
    case 'web-city':
      drawWebCity(context, width, height, time, data)
      break
    case 'deep-space':
      drawDeepSpace(context, width, height, time, data)
      break
    case 'midnight-cinema':
      drawMidnightCinema(context, width, height, time, data)
      break
    case 'underwater':
      drawUnderwater(context, width, height, time, data)
      break
    case 'world-cup-2026':
      drawStadiumLife(context, width, height, time, data)
      break
    case 'kawaii':
      drawKawaiiLife(context, width, height, time, data)
      break
    case 'neon-city':
      drawNeonLife(context, width, height, time, data)
      break
    case 'storybook':
      drawStorybookLife(context, width, height, time, data)
      break
  }
}

function fillVerticalGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stops: Array<[number, string]>,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height)
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color))
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

function drawWebCity(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  fillVerticalGradient(context, width, height, [
    [0, '#080b20'],
    [0.52, '#161943'],
    [1, '#03040c'],
  ])

  const portalX = width * 0.76
  const portalY = height * 0.2
  const portalRadius = Math.min(width, height) * 0.13
  context.save()
  context.translate(portalX, portalY)
  context.rotate(time * 0.08)
  for (let ring = 0; ring < 5; ring += 1) {
    context.strokeStyle = `rgba(${ring % 2 ? '239,68,68' : '59,130,246'},${0.23 - ring * 0.025})`
    context.lineWidth = 3 - ring * 0.35
    context.setLineDash([8 + ring * 3, 14 + ring * 2])
    context.beginPath()
    context.arc(0, 0, portalRadius * (0.58 + ring * 0.12), 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
  context.setLineDash([])

  drawComicSky(context, width, height)
  drawCityLayer(context, width, height, data.seed + 4, 0.44, '#171a37', 0.5)
  drawCityLayer(context, width, height, data.seed + 8, 0.3, '#0b0d22', 0.78)
  drawCornerWeb(context, width * 0.04, height * 0.04, Math.min(width, height) * 0.28, 0)
  drawCornerWeb(context, width * 0.98, height * 0.83, Math.min(width, height) * 0.23, Math.PI)

  context.save()
  context.globalCompositeOperation = 'screen'
  data.particles.slice(0, 22).forEach((particle) => {
    const pulse = 0.35 + Math.sin(time * particle.speed * 2 + particle.phase) * 0.2
    context.fillStyle = `rgba(${particle.x > 0.5 ? '248,72,72' : '65,124,255'},${pulse})`
    context.fillRect(particle.x * width, particle.y * height * 0.72, particle.size, particle.size)
  })
  context.restore()
}

function drawComicSky(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save()
  context.globalAlpha = 0.11
  context.fillStyle = '#f43f5e'
  const spacing = width < 640 ? 14 : 18
  for (let y = 0; y < height * 0.58; y += spacing) {
    for (let x = (y / spacing) % 2 === 0 ? 0 : spacing / 2; x < width; x += spacing) {
      context.beginPath()
      context.arc(x, y, 1.3, 0, Math.PI * 2)
      context.fill()
    }
  }
  context.restore()
}

function drawCityLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  baseline: number,
  color: string,
  windowOpacity: number,
) {
  const random = seededRandom(seed)
  let x = -12
  const baseY = height * (1 - baseline)
  while (x < width + 30) {
    const buildingWidth = 44 + random() * 74
    const buildingHeight = height * (0.16 + random() * 0.36)
    const y = baseY - buildingHeight
    context.fillStyle = color
    context.fillRect(x, y, buildingWidth, buildingHeight + height * baseline)
    context.fillStyle = `rgba(99,210,255,${windowOpacity * 0.34})`
    for (let windowY = y + 16; windowY < baseY - 10; windowY += 18) {
      for (let windowX = x + 10; windowX < x + buildingWidth - 8; windowX += 17) {
        if (random() > 0.43) context.fillRect(windowX, windowY, 4, 7)
      }
    }
    x += buildingWidth + 7 + random() * 10
  }
}

function drawCornerWeb(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
) {
  context.save()
  context.translate(x, y)
  context.rotate(rotation)
  context.strokeStyle = 'rgba(226,232,255,0.16)'
  context.lineWidth = 1.2
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray / 7) * (Math.PI / 2)
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    context.stroke()
  }
  for (let ring = 1; ring <= 5; ring += 1) {
    context.beginPath()
    context.arc(0, 0, (radius / 5) * ring, 0, Math.PI / 2)
    context.stroke()
  }
  context.restore()
}

function drawDeepSpace(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  fillVerticalGradient(context, width, height, [[0, '#030413'], [0.54, '#090b28'], [1, '#02030b']])

  const nebula = context.createRadialGradient(width * 0.28, height * 0.35, 0, width * 0.28, height * 0.35, width * 0.48)
  nebula.addColorStop(0, 'rgba(126,87,255,0.3)')
  nebula.addColorStop(0.36, 'rgba(219,66,178,0.14)')
  nebula.addColorStop(1, 'rgba(3,4,19,0)')
  context.fillStyle = nebula
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalCompositeOperation = 'screen'
  data.particles.forEach((particle) => {
    const x = ((particle.x + time * particle.speed * 0.002 * particle.depth) % 1) * width
    const y = particle.y * height
    const alpha = 0.4 + Math.sin(time * (0.7 + particle.speed) + particle.phase) * 0.28
    context.fillStyle = `rgba(222,234,255,${alpha})`
    context.beginPath()
    context.arc(x, y, particle.size * particle.depth, 0, Math.PI * 2)
    context.fill()
  })
  context.restore()

  const planetX = width * 0.76
  const planetY = height * 0.36
  const radius = Math.min(width, height) * 0.16
  context.save()
  context.translate(planetX, planetY)
  context.rotate(-0.2)
  context.strokeStyle = 'rgba(177,156,255,0.26)'
  context.lineWidth = Math.max(5, radius * 0.08)
  context.beginPath()
  context.ellipse(0, 0, radius * 1.65, radius * 0.34, 0, 0, Math.PI * 2)
  context.stroke()
  const planet = context.createRadialGradient(-radius * 0.42, -radius * 0.45, radius * 0.05, 0, 0, radius)
  planet.addColorStop(0, '#d8d1ff')
  planet.addColorStop(0.32, '#8068dd')
  planet.addColorStop(0.72, '#31245f')
  planet.addColorStop(1, '#0a0b23')
  context.fillStyle = planet
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = 'rgba(255,255,255,0.08)'
  context.lineWidth = 1
  for (let band = -2; band <= 2; band += 1) {
    context.beginPath()
    context.ellipse(0, band * radius * 0.2, radius * 0.92, radius * 0.14, 0, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()

  drawSpacecraft(context, width, height, time)
  data.secondary.slice(0, 5).forEach((meteor, index) => {
    const travel = (time * (0.035 + meteor.speed * 0.012) + meteor.phase) % 1
    const x = width * (1.15 - travel * 1.4)
    const y = height * (0.08 + meteor.y * 0.55 + travel * 0.36)
    const trail = 70 + meteor.depth * 90
    const gradient = context.createLinearGradient(x, y, x + trail, y - trail * 0.35)
    gradient.addColorStop(0, `rgba(255,241,190,${0.5 - index * 0.05})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.strokeStyle = gradient
    context.lineWidth = 1.2 + meteor.depth
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + trail, y - trail * 0.35)
    context.stroke()
  })
}

function drawSpacecraft(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const x = width * (0.2 + Math.sin(time * 0.08) * 0.04)
  const y = height * (0.66 + Math.cos(time * 0.11) * 0.025)
  const scale = Math.max(0.7, Math.min(1.35, width / 1000))
  context.save()
  context.translate(x, y)
  context.rotate(-0.12)
  context.fillStyle = '#080b18'
  context.strokeStyle = 'rgba(125,211,252,0.44)'
  context.lineWidth = 1.2
  context.beginPath()
  context.moveTo(-52 * scale, 8 * scale)
  context.lineTo(35 * scale, -15 * scale)
  context.lineTo(62 * scale, 0)
  context.lineTo(31 * scale, 14 * scale)
  context.closePath()
  context.fill()
  context.stroke()
  context.fillStyle = 'rgba(56,189,248,0.62)'
  context.fillRect(-62 * scale, 2 * scale, 24 * scale, 3 * scale)
  context.restore()
}

function drawMidnightCinema(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  fillVerticalGradient(context, width, height, [[0, '#080b12'], [0.58, '#15131b'], [1, '#050608']])

  const moon = context.createRadialGradient(width * 0.78, height * 0.15, 0, width * 0.78, height * 0.15, height * 0.2)
  moon.addColorStop(0, 'rgba(255,237,185,0.28)')
  moon.addColorStop(1, 'rgba(255,237,185,0)')
  context.fillStyle = moon
  context.fillRect(0, 0, width, height * 0.5)

  drawCinemaFacade(context, width, height, time)

  context.save()
  const beam = context.createLinearGradient(width * 0.13, height * 0.35, width * 0.82, height * 0.61)
  beam.addColorStop(0, 'rgba(255,231,171,0.18)')
  beam.addColorStop(1, 'rgba(255,231,171,0)')
  context.fillStyle = beam
  context.beginPath()
  context.moveTo(width * 0.1, height * 0.34)
  context.lineTo(width * 0.9, height * 0.53)
  context.lineTo(width * 0.9, height * 0.8)
  context.closePath()
  context.fill()
  context.restore()

  data.particles.slice(0, 54).forEach((drop) => {
    const x = drop.x * width
    const y = ((drop.y + time * drop.speed * 0.12) % 1.08) * height
    context.strokeStyle = `rgba(180,198,217,${0.08 + drop.depth * 0.16})`
    context.lineWidth = 0.7 + drop.depth
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - 5 * drop.depth, y + 18 + drop.size * 5)
    context.stroke()
  })

  drawFog(context, width, height, time, data.secondary)
  drawBats(context, width, height, time)
  drawFilmScratches(context, width, height, time, data)
}

function drawCinemaFacade(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const baseY = height * 0.62
  const centerX = width * 0.53
  const facadeWidth = Math.min(width * 0.58, 760)
  context.fillStyle = '#0b0b0f'
  context.fillRect(centerX - facadeWidth / 2, baseY - height * 0.27, facadeWidth, height * 0.55)
  context.fillStyle = '#17141a'
  context.fillRect(centerX - facadeWidth * 0.42, baseY - height * 0.36, facadeWidth * 0.84, height * 0.14)
  context.strokeStyle = 'rgba(239,175,74,0.34)'
  context.lineWidth = 2
  context.strokeRect(centerX - facadeWidth * 0.42, baseY - height * 0.36, facadeWidth * 0.84, height * 0.14)

  const bulbCount = Math.max(8, Math.floor(facadeWidth / 34))
  for (let bulb = 0; bulb < bulbCount; bulb += 1) {
    const x = centerX - facadeWidth * 0.39 + (bulb / (bulbCount - 1)) * facadeWidth * 0.78
    const pulse = 0.22 + Math.sin(time * 2 + bulb * 0.8) * 0.12
    context.fillStyle = `rgba(255,198,92,${pulse})`
    context.beginPath()
    context.arc(x, baseY - height * 0.33, 2.4, 0, Math.PI * 2)
    context.fill()
  }

  context.fillStyle = '#030405'
  const doorWidth = facadeWidth * 0.13
  for (let door = -1; door <= 1; door += 1) {
    const x = centerX + door * doorWidth * 1.15 - doorWidth / 2
    context.fillRect(x, baseY, doorWidth, height * 0.24)
    const glass = context.createLinearGradient(0, baseY, 0, baseY + height * 0.16)
    glass.addColorStop(0, 'rgba(137,38,49,0.34)')
    glass.addColorStop(1, 'rgba(17,8,10,0.1)')
    context.fillStyle = glass
    context.fillRect(x + 4, baseY + 4, doorWidth - 8, height * 0.14)
    context.fillStyle = '#030405'
  }
}

function drawFog(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  particles: Particle[],
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  particles.slice(0, 12).forEach((fog, index) => {
    const x = (((fog.x + time * fog.speed * 0.007) % 1.25) - 0.12) * width
    const y = height * (0.68 + fog.y * 0.26)
    const radius = 80 + fog.depth * Math.min(width, 240)
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(180,190,200,${0.035 + index % 3 * 0.012})`)
    gradient.addColorStop(1, 'rgba(180,190,200,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  })
  context.restore()
}

function drawBats(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  context.strokeStyle = 'rgba(1,2,4,0.62)'
  context.lineWidth = 2
  for (let bat = 0; bat < 5; bat += 1) {
    const x = width * (0.57 + bat * 0.065 + Math.sin(time * 0.3 + bat) * 0.025)
    const y = height * (0.12 + (bat % 3) * 0.07 + Math.cos(time * 0.45 + bat) * 0.018)
    const flap = 4 + Math.sin(time * 5 + bat) * 3
    context.beginPath()
    context.moveTo(x - 9, y + flap)
    context.quadraticCurveTo(x - 4, y - flap, x, y)
    context.quadraticCurveTo(x + 4, y - flap, x + 9, y + flap)
    context.stroke()
  }
}

function drawFilmScratches(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  context.save()
  context.globalAlpha = 0.08
  context.strokeStyle = '#f8ead0'
  data.secondary.slice(0, 6).forEach((scratch, index) => {
    const x = ((scratch.x + Math.floor(time * (2 + index * 0.2)) * 0.17) % 1) * width
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x + Math.sin(index) * 4, height)
    context.stroke()
  })
  context.restore()
}

function drawUnderwater(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  fillVerticalGradient(context, width, height, [[0, '#063b53'], [0.45, '#062b43'], [1, '#020c18']])

  context.save()
  context.globalCompositeOperation = 'screen'
  for (let ray = 0; ray < 7; ray += 1) {
    const x = width * (ray / 6) + Math.sin(time * 0.08 + ray) * 40
    const gradient = context.createLinearGradient(x, 0, x + 140, height * 0.8)
    gradient.addColorStop(0, 'rgba(151,240,255,0.12)')
    gradient.addColorStop(1, 'rgba(151,240,255,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.moveTo(x - 35, -10)
    context.lineTo(x + 45, -10)
    context.lineTo(x + 210, height)
    context.lineTo(x + 70, height)
    context.closePath()
    context.fill()
  }
  context.restore()

  drawUnderwaterRuins(context, width, height)
  drawJellyfish(context, width, height, time, data.secondary)
  drawFishSchool(context, width, height, time, data.particles)

  data.particles.slice(0, 46).forEach((bubble) => {
    const x = bubble.x * width + Math.sin(time * 0.6 + bubble.phase) * 9
    const y = height * (1.08 - ((bubble.y + time * bubble.speed * 0.025) % 1.16))
    const radius = 1.4 + bubble.size * 1.4
    context.strokeStyle = `rgba(177,235,246,${0.14 + bubble.depth * 0.2})`
    context.lineWidth = 0.8
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.stroke()
  })

  drawCaustics(context, width, height, time)
}

function drawUnderwaterRuins(context: CanvasRenderingContext2D, width: number, height: number) {
  const floorY = height * 0.79
  context.fillStyle = '#03101a'
  context.beginPath()
  context.moveTo(0, floorY)
  for (let x = 0; x <= width; x += 70) {
    context.lineTo(x, floorY + Math.sin(x * 0.021) * 18)
  }
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.fill()

  context.fillStyle = 'rgba(5,22,29,0.88)'
  const baseX = width * 0.68
  for (let column = 0; column < 4; column += 1) {
    const x = baseX + column * 52
    const columnHeight = height * (0.18 + (column % 2) * 0.08)
    context.fillRect(x, floorY - columnHeight, 24, columnHeight)
    context.fillRect(x - 7, floorY - columnHeight - 8, 38, 9)
  }
  context.fillRect(baseX - 18, floorY - height * 0.1, 205, 16)

  context.strokeStyle = 'rgba(24,111,88,0.55)'
  context.lineWidth = 5
  for (let coral = 0; coral < 9; coral += 1) {
    const x = width * (0.05 + coral * 0.09)
    context.beginPath()
    context.moveTo(x, floorY + 20)
    context.quadraticCurveTo(x - 13, floorY - 22 - (coral % 3) * 12, x + 4, floorY - 58 - (coral % 4) * 9)
    context.moveTo(x - 2, floorY - 18)
    context.lineTo(x - 22, floorY - 39)
    context.moveTo(x + 1, floorY - 32)
    context.lineTo(x + 21, floorY - 54)
    context.stroke()
  }
}

function drawJellyfish(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  jellyfish: Particle[],
) {
  context.save()
  context.globalCompositeOperation = 'screen'
  jellyfish.slice(0, 7).forEach((jelly, index) => {
    const x = jelly.x * width + Math.sin(time * 0.17 + jelly.phase) * 24
    const y = height * (0.16 + jelly.y * 0.53) + Math.cos(time * 0.21 + jelly.phase) * 16
    const size = 10 + jelly.depth * 16
    const pulse = 0.72 + Math.sin(time * 1.4 + jelly.phase) * 0.12
    const glow = context.createRadialGradient(x, y, 0, x, y, size * 2.3)
    glow.addColorStop(0, index % 2 ? 'rgba(133,255,231,0.3)' : 'rgba(170,137,255,0.28)')
    glow.addColorStop(1, 'rgba(120,220,255,0)')
    context.fillStyle = glow
    context.beginPath()
    context.arc(x, y, size * 2.3, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = index % 2 ? 'rgba(124,241,220,0.34)' : 'rgba(179,142,255,0.31)'
    context.beginPath()
    context.ellipse(x, y, size * pulse, size * 0.65 * pulse, 0, Math.PI, 0)
    context.fill()
    context.strokeStyle = 'rgba(190,241,255,0.22)'
    context.lineWidth = 1
    for (let tentacle = -2; tentacle <= 2; tentacle += 1) {
      context.beginPath()
      context.moveTo(x + tentacle * size * 0.3, y)
      context.bezierCurveTo(x + tentacle * 4, y + size, x + Math.sin(time + tentacle) * 8, y + size * 1.5, x + tentacle * 2, y + size * 2.2)
      context.stroke()
    }
  })
  context.restore()
}

function drawFishSchool(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  fish: Particle[],
) {
  context.fillStyle = 'rgba(2,11,20,0.58)'
  fish.slice(0, 18).forEach((item) => {
    const x = ((item.x + time * item.speed * 0.018) % 1.16 - 0.08) * width
    const y = height * (0.18 + item.y * 0.48) + Math.sin(time + item.phase) * 6
    const size = 3 + item.depth * 7
    context.beginPath()
    context.ellipse(x, y, size * 1.4, size * 0.55, 0, 0, Math.PI * 2)
    context.moveTo(x - size, y)
    context.lineTo(x - size * 2, y - size * 0.75)
    context.lineTo(x - size * 2, y + size * 0.75)
    context.closePath()
    context.fill()
  })
}

function drawCaustics(context: CanvasRenderingContext2D, width: number, height: number, time: number) {
  context.save()
  context.globalCompositeOperation = 'screen'
  context.strokeStyle = 'rgba(127,229,240,0.055)'
  context.lineWidth = 2
  for (let line = 0; line < 12; line += 1) {
    const y = height * 0.08 + line * height * 0.055
    context.beginPath()
    for (let x = -20; x <= width + 20; x += 34) {
      const waveY = y + Math.sin(x * 0.02 + time * 0.5 + line) * 12
      if (x === -20) context.moveTo(x, waveY)
      else context.lineTo(x, waveY)
    }
    context.stroke()
  }
  context.restore()
}

function drawStadiumLife(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  const crowdY = height * 0.72
  context.save()
  context.globalCompositeOperation = 'multiply'
  const crowd = context.createLinearGradient(0, crowdY, 0, height)
  crowd.addColorStop(0, 'rgba(8,47,78,0)')
  crowd.addColorStop(1, 'rgba(8,47,78,0.13)')
  context.fillStyle = crowd
  context.fillRect(0, crowdY, width, height - crowdY)
  context.restore()

  data.particles.slice(0, 70).forEach((spectator, index) => {
    const x = spectator.x * width
    const y = crowdY + spectator.y * height * 0.2
    const flash = Math.sin(time * (0.8 + spectator.speed) + spectator.phase) > 0.94
    const sideArgentina = x < width / 2
    context.fillStyle = flash
      ? 'rgba(255,255,255,0.74)'
      : sideArgentina
        ? 'rgba(85,160,214,0.28)'
        : index % 3 === 0
          ? 'rgba(248,196,65,0.3)'
          : 'rgba(205,37,51,0.26)'
    context.beginPath()
    context.arc(x, y, 1 + spectator.depth * 1.6, 0, Math.PI * 2)
    context.fill()
  })

  context.lineWidth = 2
  for (let flag = 0; flag < 8; flag += 1) {
    const argentina = flag < 4
    const x = width * (0.08 + flag * 0.12)
    const y = height * (0.76 + (flag % 2) * 0.055)
    context.strokeStyle = 'rgba(30,41,59,0.25)'
    context.beginPath()
    context.moveTo(x, y - 30)
    context.lineTo(x, y + 10)
    context.stroke()
    context.fillStyle = argentina ? 'rgba(111,178,224,0.42)' : flag % 2 ? 'rgba(205,37,51,0.44)' : 'rgba(247,196,69,0.44)'
    context.beginPath()
    context.moveTo(x, y - 30)
    context.quadraticCurveTo(x + 18, y - 36 + Math.sin(time * 2 + flag) * 4, x + 34, y - 28)
    context.lineTo(x + 32, y - 14)
    context.quadraticCurveTo(x + 17, y - 20 + Math.sin(time * 2 + flag) * 4, x, y - 17)
    context.closePath()
    context.fill()
  }
}

function drawKawaiiLife(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  data.secondary.slice(0, 22).forEach((item, index) => {
    const x = item.x * width + Math.sin(time * 0.24 + item.phase) * 18
    const y = height * (1.12 - ((item.y + time * item.speed * 0.018) % 1.24))
    const size = 4 + item.depth * 8
    context.save()
    context.translate(x, y)
    context.rotate(Math.sin(time * 0.6 + item.phase) * 0.35)
    context.fillStyle = index % 2 ? 'rgba(244,114,182,0.2)' : 'rgba(124,58,237,0.16)'
    if (index % 3 === 0) {
      context.beginPath()
      context.moveTo(0, size * 0.85)
      context.bezierCurveTo(-size * 1.6, -size * 0.2, -size * 0.8, -size * 1.2, 0, -size * 0.35)
      context.bezierCurveTo(size * 0.8, -size * 1.2, size * 1.6, -size * 0.2, 0, size * 0.85)
      context.fill()
    } else {
      context.beginPath()
      for (let point = 0; point < 8; point += 1) {
        const angle = point * Math.PI / 4
        const radius = point % 2 ? size * 0.34 : size
        const px = Math.cos(angle) * radius
        const py = Math.sin(angle) * radius
        if (point === 0) context.moveTo(px, py)
        else context.lineTo(px, py)
      }
      context.closePath()
      context.fill()
    }
    context.restore()
  })
}

function drawNeonLife(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  data.particles.slice(0, 62).forEach((drop) => {
    const x = ((drop.x + time * 0.008 * drop.depth) % 1.04) * width
    const y = ((drop.y + time * drop.speed * 0.16) % 1.08) * height
    context.strokeStyle = `rgba(${drop.x > 0.5 ? '255,79,216' : '39,244,210'},${0.07 + drop.depth * 0.13})`
    context.lineWidth = 0.6 + drop.depth
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - 8, y + 28 + drop.size * 7)
    context.stroke()
  })

  data.secondary.slice(0, 7).forEach((vehicle, index) => {
    const direction = index % 2 === 0 ? 1 : -1
    const travel = (vehicle.x + time * vehicle.speed * 0.035) % 1.2
    const x = direction === 1 ? travel * width : width - travel * width
    const y = height * (0.55 + vehicle.y * 0.26)
    const trail = direction * (34 + vehicle.depth * 55)
    const gradient = context.createLinearGradient(x, y, x - trail, y)
    gradient.addColorStop(0, index % 2 ? 'rgba(255,79,216,0.56)' : 'rgba(39,244,210,0.56)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.strokeStyle = gradient
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - trail, y)
    context.stroke()
  })
}

function drawStorybookLife(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  data: SceneData,
) {
  context.save()
  context.globalAlpha = 0.08
  context.strokeStyle = '#fff1b2'
  context.lineWidth = 1
  const stars = data.particles.slice(0, 18)
  stars.forEach((star, index) => {
    const next = stars[(index + 1) % stars.length]
    if (Math.abs(star.y - next.y) < 0.2) {
      context.beginPath()
      context.moveTo(star.x * width, star.y * height * 0.54)
      context.lineTo(next.x * width, next.y * height * 0.54)
      context.stroke()
    }
  })
  context.restore()

  data.secondary.slice(0, 7).forEach((cloud, index) => {
    const x = (((cloud.x + time * cloud.speed * 0.004) % 1.28) - 0.14) * width
    const y = height * (0.12 + cloud.y * 0.32)
    const radius = 55 + cloud.depth * 90
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(218,210,232,${0.025 + index % 2 * 0.012})`)
    gradient.addColorStop(1, 'rgba(218,210,232,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.ellipse(x, y, radius * 1.7, radius * 0.58, 0, 0, Math.PI * 2)
    context.fill()
  })
}
