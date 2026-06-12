/**
 * Tests for repository.factory.ts
 *
 * Matrix:
 *  ('online',  true)  => SupabaseSessionRepository
 *  ('online',  false) => OnlineCacheSessionRepository
 *  ('offline', any)   => LocalSessionRepository
 *  ('demo',    any)   => LocalSessionRepository
 */

// Prevent ts-jest from compiling supabase.client (import.meta.env not available in jest)
jest.mock('@/shared/services/supabase.client', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(false),
  getSupabaseClient: jest.fn().mockReturnValue(null),
}))

import { createSessionRepository } from '@/modules/game/infrastructure/repository.factory'
import { SupabaseSessionRepository } from '@/modules/game/infrastructure/supabase-session.repository'
import { OnlineCacheSessionRepository } from '@/modules/game/infrastructure/online-cache-session.repository'
import { LocalSessionRepository } from '@/modules/game/infrastructure/local-session.repository'

describe('createSessionRepository — mode/auth matrix', () => {
  it('online + authenticated => SupabaseSessionRepository', () => {
    const repo = createSessionRepository('online', true)
    expect(repo).toBeInstanceOf(SupabaseSessionRepository)
    expect(repo.getBackendLabel()).toBe('supabase')
  })

  it('online + not authenticated => OnlineCacheSessionRepository', () => {
    const repo = createSessionRepository('online', false)
    expect(repo).toBeInstanceOf(OnlineCacheSessionRepository)
    expect(repo.getBackendLabel()).toBe('online-cache')
  })

  it('online + default (no auth arg) => OnlineCacheSessionRepository', () => {
    const repo = createSessionRepository('online')
    expect(repo).toBeInstanceOf(OnlineCacheSessionRepository)
  })

  it('offline + authenticated => LocalSessionRepository', () => {
    const repo = createSessionRepository('offline', true)
    expect(repo).toBeInstanceOf(LocalSessionRepository)
    expect(repo.getBackendLabel()).toBe('local')
  })

  it('offline + not authenticated => LocalSessionRepository', () => {
    const repo = createSessionRepository('offline', false)
    expect(repo).toBeInstanceOf(LocalSessionRepository)
  })

  it('offline + default => LocalSessionRepository', () => {
    const repo = createSessionRepository('offline')
    expect(repo).toBeInstanceOf(LocalSessionRepository)
  })

  it('demo + authenticated => LocalSessionRepository', () => {
    const repo = createSessionRepository('demo', true)
    expect(repo).toBeInstanceOf(LocalSessionRepository)
    expect(repo.getBackendLabel()).toBe('local')
  })

  it('demo + not authenticated => LocalSessionRepository', () => {
    const repo = createSessionRepository('demo', false)
    expect(repo).toBeInstanceOf(LocalSessionRepository)
  })

  it('online + auth returns the same singleton each call', () => {
    const r1 = createSessionRepository('online', true)
    const r2 = createSessionRepository('online', true)
    expect(r1).toBe(r2)
  })

  it('online + !auth returns the same singleton each call', () => {
    const r1 = createSessionRepository('online', false)
    const r2 = createSessionRepository('online', false)
    expect(r1).toBe(r2)
  })
})
