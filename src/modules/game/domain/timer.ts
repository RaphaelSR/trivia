const POINTS_TIMER_DEFAULTS: Array<{ maxPoints: number; seconds: number }> = [
  { maxPoints: 5, seconds: 30 },
  { maxPoints: 10, seconds: 40 },
  { maxPoints: 15, seconds: 50 },
  { maxPoints: 20, seconds: 60 },
  { maxPoints: 30, seconds: 65 },
  { maxPoints: Infinity, seconds: 80 },
]

export function getDefaultTimerForPoints(points: number): number {
  const entry = POINTS_TIMER_DEFAULTS.find((timer) => points <= timer.maxPoints)
  return entry?.seconds ?? 80
}
