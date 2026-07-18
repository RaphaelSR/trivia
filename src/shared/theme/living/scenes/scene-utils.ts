import type { LivingSceneViewport } from '../types'

export const TAU = Math.PI * 2

export function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

export function smoothstep(value: number) {
  const clamped = clamp(value)
  return clamped * clamped * (3 - 2 * clamped)
}

export function wrap(value: number, maximum = 1) {
  return ((value % maximum) + maximum) % maximum
}

export function getActiveCount(
  total: number,
  viewport: LivingSceneViewport,
  minimum = 1,
) {
  return Math.min(total, Math.max(minimum, Math.round(total * viewport.density)))
}

export function viewportScale(viewport: LivingSceneViewport) {
  return Math.max(0.68, Math.min(1.45, Math.min(viewport.width / 1280, viewport.height / 760)))
}

export function drawRadialGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerColor: string,
  outerColor = 'rgba(0,0,0,0)',
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, innerColor)
  gradient.addColorStop(1, outerColor)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, TAU)
  context.fill()
}

export function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, radius)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}
