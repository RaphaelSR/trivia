/**
 * Tests for TabGuard
 *
 * Strategy: replace global.BroadcastChannel with an in-process fake bus so
 * multiple createTabGuard() instances "see" each other like real tabs would.
 */

import { createTabGuard } from '@/modules/game/infrastructure/tab-guard'

type MessageHandler = ((event: { data: unknown }) => void) | null

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = []

  onmessage: MessageHandler = null
  closed = false
  name: string

  constructor(name: string) {
    this.name = name
    FakeBroadcastChannel.instances.push(this)
  }

  postMessage(data: unknown): void {
    if (this.closed) throw new Error('channel closed')
    for (const other of FakeBroadcastChannel.instances) {
      if (other !== this && !other.closed && other.name === this.name) {
        other.onmessage?.({ data })
      }
    }
  }

  close(): void {
    this.closed = true
  }
}

const realBroadcastChannel = globalThis.BroadcastChannel

describe('TabGuard', () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = []
    ;(globalThis as Record<string, unknown>).BroadcastChannel = FakeBroadcastChannel
  })

  afterEach(() => {
    if (realBroadcastChannel) {
      ;(globalThis as Record<string, unknown>).BroadcastChannel = realBroadcastChannel
    } else {
      delete (globalThis as Record<string, unknown>).BroadcastChannel
    }
  })

  it('a single tab reports zero other tabs', () => {
    const guard = createTabGuard('game-1')
    const seen: number[] = []
    guard.subscribe((n) => seen.push(n))
    expect(seen).toEqual([0])
    guard.dispose()
  })

  it('two tabs on the SAME session detect each other (hello/here handshake)', () => {
    const first = createTabGuard('game-1')
    const firstSeen: number[] = []
    first.subscribe((n) => firstSeen.push(n))

    const second = createTabGuard('game-1')
    const secondSeen: number[] = []
    second.subscribe((n) => secondSeen.push(n))

    // A aba antiga viu o hello da nova; a nova viu o here da antiga.
    expect(firstSeen[firstSeen.length - 1]).toBe(1)
    expect(secondSeen[0]).toBe(1)

    first.dispose()
    second.dispose()
  })

  it('tabs on DIFFERENT sessions ignore each other', () => {
    const first = createTabGuard('game-1')
    const firstSeen: number[] = []
    first.subscribe((n) => firstSeen.push(n))

    const second = createTabGuard('game-2')
    const secondSeen: number[] = []
    second.subscribe((n) => secondSeen.push(n))

    expect(firstSeen).toEqual([0])
    expect(secondSeen).toEqual([0])

    first.dispose()
    second.dispose()
  })

  it('dispose announces bye and the remaining tab drops to zero', () => {
    const first = createTabGuard('game-1')
    const second = createTabGuard('game-1')

    let firstCount = -1
    first.subscribe((n) => {
      firstCount = n
    })
    expect(firstCount).toBe(1)

    second.dispose()
    expect(firstCount).toBe(0)

    first.dispose()
  })

  it('pagehide announces bye to the peers', () => {
    const first = createTabGuard('game-1')
    const second = createTabGuard('game-1')

    let firstCount = -1
    first.subscribe((n) => {
      firstCount = n
    })
    expect(firstCount).toBe(1)

    // No jsdom os dois guards compartilham o MESMO window, então o pagehide
    // dispara o bye de ambos — o que valida é: quem recebe bye zera o peer.
    window.dispatchEvent(new Event('pagehide'))
    expect(firstCount).toBe(0)

    first.dispose()
    second.dispose()
  })

  it('three tabs: counts reflect every peer, and drop as they leave', () => {
    const a = createTabGuard('game-1')
    const b = createTabGuard('game-1')
    const c = createTabGuard('game-1')

    let aCount = -1
    a.subscribe((n) => {
      aCount = n
    })
    expect(aCount).toBe(2)

    b.dispose()
    expect(aCount).toBe(1)
    c.dispose()
    expect(aCount).toBe(0)

    a.dispose()
  })

  it('is inert (zero, no throw) when BroadcastChannel is unavailable', () => {
    delete (globalThis as Record<string, unknown>).BroadcastChannel

    const guard = createTabGuard('game-1')
    const seen: number[] = []
    guard.subscribe((n) => seen.push(n))
    expect(seen).toEqual([0])
    expect(() => guard.dispose()).not.toThrow()
  })
})
