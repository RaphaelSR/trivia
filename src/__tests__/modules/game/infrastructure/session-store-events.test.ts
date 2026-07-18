import {
  notifySessionStoreChanged,
  subscribeSessionStore,
} from '@/modules/game/infrastructure/session-store-events'

describe('session-store-events', () => {
  it('notifica todos os consumidores da mesma aba', () => {
    const first = jest.fn()
    const second = jest.fn()
    const unsubscribeFirst = subscribeSessionStore(first)
    const unsubscribeSecond = subscribeSessionStore(second)

    notifySessionStoreChanged()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    unsubscribeSecond()
  })

  it('deixa de notificar um consumidor depois do unsubscribe', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeSessionStore(listener)

    unsubscribe()
    notifySessionStoreChanged()

    expect(listener).not.toHaveBeenCalled()
  })
})
