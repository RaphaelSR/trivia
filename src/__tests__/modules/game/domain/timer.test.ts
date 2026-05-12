import { getDefaultTimerForPoints } from '@/modules/game/domain/timer'

describe('timer domain', () => {
  it.each([
    [5, 30],
    [10, 40],
    [15, 50],
    [20, 60],
    [30, 65],
    [50, 80],
  ])('returns %s-point questions default timer as %s seconds', (points, seconds) => {
    expect(getDefaultTimerForPoints(points)).toBe(seconds)
  })

  it('uses the next timer bucket for values between configured point thresholds', () => {
    expect(getDefaultTimerForPoints(6)).toBe(40)
    expect(getDefaultTimerForPoints(21)).toBe(65)
  })
})
