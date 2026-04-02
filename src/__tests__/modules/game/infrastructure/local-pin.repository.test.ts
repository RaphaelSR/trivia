import { LocalPinRepository } from '@/modules/game/infrastructure/local-pin.repository'

describe('LocalPinRepository', () => {
  const repository = new LocalPinRepository()

  beforeEach(() => {
    localStorage.clear()
  })

  it('only verifies a PIN when one is explicitly configured', () => {
    expect(repository.verifyPin('demo', 'password123')).toBe(false)
    expect(repository.hasCustomPin('demo')).toBe(false)

    repository.savePin('offline', '4321')

    expect(repository.verifyPin('offline', '4321')).toBe(true)
    expect(repository.hasCustomPin('offline')).toBe(true)
  })
})
