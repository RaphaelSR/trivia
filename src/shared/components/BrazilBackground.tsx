import { useEffect, useRef } from 'react'
import type { VisualEffectsMode } from '@/shared/services/sound-settings'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
  type: 'star' | 'flag' | 'trophy'
  opacity: number
}

const GREEN = '#009739'
const YELLOW = '#ffdf00'
const BLUE = '#002776'
const GOLD = '#f7c948'

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = p.type === 'trophy' ? GOLD : YELLOW
  const outer = p.size
  const inner = p.size * 0.42
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const method = i === 0 ? 'moveTo' : 'lineTo'
    ctx[method](Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawFlag(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity

  ctx.fillStyle = GREEN
  ctx.beginPath()
  ctx.roundRect(-s * 1.4, -s * 0.9, s * 2.8, s * 1.8, s * 0.18)
  ctx.fill()

  ctx.fillStyle = YELLOW
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.68)
  ctx.lineTo(s * 1.05, 0)
  ctx.lineTo(0, s * 0.68)
  ctx.lineTo(-s * 1.05, 0)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = BLUE
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.43, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.72)'
  ctx.lineWidth = Math.max(1, s * 0.08)
  ctx.beginPath()
  ctx.arc(0, s * 0.04, s * 0.44, Math.PI * 1.08, Math.PI * 1.82)
  ctx.stroke()
  ctx.restore()
}

function drawWorldCupTrophy(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity

  const gradient = ctx.createLinearGradient(-s, -s * 1.4, s, s * 1.5)
  gradient.addColorStop(0, '#fff2a6')
  gradient.addColorStop(0.45, GOLD)
  gradient.addColorStop(1, '#b7791f')
  ctx.fillStyle = gradient
  ctx.strokeStyle = 'rgba(89, 62, 10, 0.18)'
  ctx.lineWidth = Math.max(1, s * 0.06)

  ctx.beginPath()
  ctx.arc(0, -s * 0.9, s * 0.62, Math.PI * 0.08, Math.PI * 0.92, true)
  ctx.bezierCurveTo(-s * 0.58, -s * 0.4, -s * 0.34, s * 0.2, -s * 0.2, s * 0.65)
  ctx.lineTo(s * 0.2, s * 0.65)
  ctx.bezierCurveTo(s * 0.34, s * 0.2, s * 0.58, -s * 0.4, s * 0.58, -s * 0.9)
  ctx.arc(0, -s * 0.9, s * 0.62, Math.PI * 0.08, Math.PI * 0.92, false)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#1f9d55'
  ctx.beginPath()
  ctx.ellipse(-s * 0.22, -s * 0.9, s * 0.18, s * 0.34, -0.4, 0, Math.PI * 2)
  ctx.ellipse(s * 0.22, -s * 0.9, s * 0.18, s * 0.34, 0.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = gradient
  ctx.fillRect(-s * 0.28, s * 0.58, s * 0.56, s * 0.56)
  ctx.beginPath()
  ctx.roundRect(-s * 0.58, s * 1.08, s * 1.16, s * 0.28, s * 0.08)
  ctx.fill()
  ctx.restore()
}

function drawFlagRibbon(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const centerY = height * 0.55
  const amplitude = Math.min(34, height * 0.035)
  const stripeHeight = Math.min(140, height * 0.18)

  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.beginPath()
  for (let x = -40; x <= width + 40; x += 24) {
    const y = centerY + Math.sin(x * 0.01 + time * 0.00055) * amplitude
    if (x === -40) ctx.moveTo(x, y - stripeHeight / 2)
    else ctx.lineTo(x, y - stripeHeight / 2)
  }
  for (let x = width + 40; x >= -40; x -= 24) {
    const y = centerY + Math.sin(x * 0.01 + time * 0.00055) * amplitude
    ctx.lineTo(x, y + stripeHeight / 2)
  }
  ctx.closePath()
  ctx.fillStyle = GREEN
  ctx.fill()

  ctx.globalAlpha = 0.22
  ctx.beginPath()
  ctx.moveTo(width * 0.5, centerY - stripeHeight * 0.52)
  ctx.lineTo(width * 0.74, centerY)
  ctx.lineTo(width * 0.5, centerY + stripeHeight * 0.52)
  ctx.lineTo(width * 0.26, centerY)
  ctx.closePath()
  ctx.fillStyle = YELLOW
  ctx.fill()

  ctx.globalAlpha = 0.14
  ctx.fillStyle = BLUE
  ctx.beginPath()
  ctx.arc(width * 0.5, centerY, stripeHeight * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function BrazilBackground({ motionMode = 'full' }: { motionMode?: VisualEffectsMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return
    const canvasContext = canvasElement.getContext('2d')
    if (!canvasContext) return
    const canvas = canvasElement
    const ctx = canvasContext
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduceMotion = motionQuery.matches
    let lastFrameAt = Number.NEGATIVE_INFINITY
    let lastVisualTime = 0

    function currentMotion() {
      return reduceMotion ? 'still' : motionMode
    }

    function resizeCanvas() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function createParticles() {
      const count = Math.min(Math.floor(window.innerWidth / 44), 42)
      particlesRef.current = Array.from({ length: count }, (_, index) => {
        const typePool: Particle['type'][] = ['flag', 'flag', 'flag', 'flag', 'star', 'star', 'trophy']
        const type = index === 0 ? 'trophy' : typePool[Math.floor(Math.random() * typePool.length)]
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: type === 'trophy' ? 16 + Math.random() * 10 : type === 'flag' ? 9 + Math.random() * 15 : 7 + Math.random() * 10,
          speedX: 0.12 + Math.random() * 0.32,
          speedY: (Math.random() - 0.5) * 0.18,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.006,
          type,
          opacity: type === 'trophy' ? 0.2 + Math.random() * 0.15 : 0.16 + Math.random() * 0.2,
        }
      })
    }

    resizeCanvas()
    createParticles()

    function drawFrame(time: number, advanceScale: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawFlagRibbon(ctx, canvas.width, canvas.height, time)

      for (const particle of particlesRef.current) {
        if (advanceScale > 0) {
          particle.x += particle.speedX * advanceScale
          particle.y += (particle.speedY + Math.sin(time * 0.001 + particle.x * 0.01) * 0.025) * advanceScale
          particle.rotation += particle.rotationSpeed * advanceScale
        }

        if (particle.x > canvas.width + particle.size * 4) {
          particle.x = -particle.size * 4
          particle.y = Math.random() * canvas.height
        }
        if (particle.y < -particle.size * 4) particle.y = canvas.height + particle.size * 4
        if (particle.y > canvas.height + particle.size * 4) particle.y = -particle.size * 4

        if (particle.type === 'flag') drawFlag(ctx, particle)
        else if (particle.type === 'trophy') drawWorldCupTrophy(ctx, particle)
        else drawStar(ctx, particle)
      }
    }

    function animate(time: number) {
      const activeMotion = currentMotion()
      if (activeMotion === 'still') return
      if (activeMotion === 'ambient' && time - lastFrameAt < 1000 / 15) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }
      const elapsedMs = Number.isFinite(lastFrameAt)
        ? Math.max(0, time - lastFrameAt)
        : 1000 / 60
      const motionScale = activeMotion === 'ambient' ? 0.58 : 1
      const advanceScale = Math.min(4, elapsedMs / (1000 / 60)) * motionScale
      lastFrameAt = time
      lastVisualTime += elapsedMs * motionScale
      drawFrame(lastVisualTime, advanceScale)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    function restartAnimation() {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
      lastFrameAt = Number.NEGATIVE_INFINITY
      drawFrame(lastVisualTime, 0)
      if (currentMotion() !== 'still') {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    function handleResize() {
      resizeCanvas()
      createParticles()
      drawFrame(lastVisualTime, 0)
    }

    function handleMotionChange(event: MediaQueryListEvent) {
      reduceMotion = event.matches
      restartAnimation()
    }

    drawFrame(0, 0)
    if (currentMotion() !== 'still') {
      animFrameRef.current = requestAnimationFrame(animate)
    }
    window.addEventListener('resize', handleResize)
    motionQuery.addEventListener('change', handleMotionChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      motionQuery.removeEventListener('change', handleMotionChange)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [motionMode])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.95 }}
      data-theme-motion={motionMode}
      aria-hidden="true"
    />
  )
}
