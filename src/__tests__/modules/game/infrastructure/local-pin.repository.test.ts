import { LocalPinRepository } from '@/modules/game/infrastructure/local-pin.repository'

describe('LocalPinRepository', () => {
  const repository = new LocalPinRepository()

  beforeEach(() => {
    localStorage.clear()
  })

  it('uses default PIN for demo and custom PIN for offline', () => {
    expect(repository.verifyPin('demo', 'password123')).toBe(true)
    repository.savePin('offline', '4321')
    expect(repository.verifyPin('offline', '4321')).toBe(true)
    expect(repository.hasCustomPin('offline')).toBe(true)
  })
})
