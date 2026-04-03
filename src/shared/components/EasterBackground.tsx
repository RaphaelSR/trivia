import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  rotation: number
  rotationSpeed: number
  type: 'egg' | 'bunny' | 'star'
  color: string
  opacity: number
}

const COLORS = [
  '#818cf8', // indigo
  '#38bdf8', // cyan
  '#f472b6', // pink
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fbbf24', // amber
]

function drawEgg(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = p.color
  ctx.beginPath()
  // egg shape using bezier curves
  const s = p.size
  ctx.moveTo(0, -s * 1.3)
  ctx.bezierCurveTo(s * 0.8, -s * 1.3, s, -s * 0.2, s * 0.8, s * 0.5)
  ctx.bezierCurveTo(s * 0.6, s * 1.1, -s * 0.6, s * 1.1, -s * 0.8, s * 0.5)
  ctx.bezierCurveTo(-s, -s * 0.2, -s * 0.8, -s * 1.3, 0, -s * 1.3)
  ctx.fill()
  // stripe decoration
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-s * 0.6, -s * 0.2)
  ctx.quadraticCurveTo(0, -s * 0.5, s * 0.6, -s * 0.2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-s * 0.7, s * 0.2)
  ctx.quadraticCurveTo(0, -s * 0.1, s * 0.7, s * 0.2)
  ctx.stroke()
  ctx.restore()
}

function drawBunny(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = p.color
  const s = p.size * 0.7
  // head
  ctx.beginPath()
  ctx.arc(0, 0, s, 0, Math.PI * 2)
  ctx.fill()
  // left ear
  ctx.beginPath()
  ctx.ellipse(-s * 0.45, -s * 1.8, s * 0.3, s * 0.9, -0.15, 0, Math.PI * 2)
  ctx.fill()
  // right ear
  ctx.beginPath()
  ctx.ellipse(s * 0.45, -s * 1.8, s * 0.3, s * 0.9, 0.15, 0, Math.PI * 2)
  ctx.fill()
  // inner ears
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.ellipse(-s * 0.45, -s * 1.8, s * 0.15, s * 0.6, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(s * 0.45, -s * 1.8, s * 0.15, s * 0.6, 0.15, 0, Math.PI * 2)
  ctx.fill()
  // eyes
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.arc(-s * 0.3, -s * 0.15, s * 0.12, 0, Math.PI * 2)
  ctx.arc(s * 0.3, -s * 0.15, s * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = p.opacity * 0.6
  ctx.fillStyle = p.color
  const s = p.size * 0.5
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const method = i === 0 ? 'moveTo' : 'lineTo'
    ctx[method](Math.cos(angle) * s, Math.sin(angle) * s)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function EasterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // create particles
    const count = Math.min(Math.floor(window.innerWidth / 50), 30)
    particlesRef.current = Array.from({ length: count }, () => {
      const types: Particle['type'][] = ['egg', 'egg', 'egg', 'bunny', 'star', 'star']
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 8 + Math.random() * 14,
        speedY: -(0.15 + Math.random() * 0.35),
        speedX: (Math.random() - 0.5) * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        type: types[Math.floor(Math.random() * types.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.18 + Math.random() * 0.25,
      }
    })

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particlesRef.current) {
        p.y += p.speedY
        p.x += p.speedX
        p.rotation += p.rotationSpeed

        // wrap around
        if (p.y < -p.size * 3) {
          p.y = canvas!.height + p.size * 3
          p.x = Math.random() * canvas!.width
        }

        if (p.type === 'egg') drawEgg(ctx!, p)
        else if (p.type === 'bunny') drawBunny(ctx!, p)
        else drawStar(ctx!, p)
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.9 }}
    />
  )
}
