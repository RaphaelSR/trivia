import { calculateMimicaPoints, createMimicaScoreEntry } from '@/modules/game/domain/scoring'

describe('scoring domain', () => {
  it('calculates mimica points for all supported modes', () => {
    expect(calculateMimicaPoints(50, 'full-current', 3)).toBe(50)
    expect(calculateMimicaPoints(50, 'half-current', 3)).toBe(25)
    expect(calculateMimicaPoints(50, 'steal', 3)).toBe(50)
    expect(calculateMimicaPoints(50, 'everyone', 4)).toBe(13)
    expect(calculateMimicaPoints(50, 'void', 4)).toBe(0)
  })

  it('creates mimica score entries with stable payload shape', () => {
    const entry = createMimicaScoreEntry({
      participantId: 'participant-1',
      teamId: 'team-1',
      pointsAwarded: 25,
      turnNumber: 2,
      roundNumber: 1,
      mode: 'half-current',
    })

    expect(entry.id).toContain('mimica-')
    expect(entry.mode).toBe('half-current')
    expect(entry.pointsAwarded).toBe(25)
    expect(entry.timestamp).toBeTruthy()
  })
})
