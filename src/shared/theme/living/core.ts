import type { LivingSceneViewport } from './types'

export type Particle = {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  depth: number
}

export type ProceduralSceneState = {
  particles: Particle[]
  secondary: Particle[]
  seed: number
}

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export function getSceneDensity(width: number) {
  return width < 640 ? 0.58 : width < 1100 ? 0.78 : 1
}

export function createParticles(
  count: number,
  random: () => number,
): Particle[] {
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    size: 0.45 + random() * 1.9,
    speed: 0.15 + random() * 0.85,
    phase: random() * Math.PI * 2,
    depth: 0.28 + random() * 0.72,
  }))
}

export function createProceduralSceneState(
  seed: number,
  viewport: LivingSceneViewport,
): ProceduralSceneState {
  const random = seededRandom(seed)
  return {
    particles: createParticles(Math.round(90 * viewport.density), random),
    secondary: createParticles(Math.round(38 * viewport.density), random),
    seed,
  }
}
