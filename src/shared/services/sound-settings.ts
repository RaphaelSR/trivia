import { STORAGE_KEYS } from '@/shared/constants/storage'
import { storageService } from './storage.service'

export type SoundMode = 'off' | 'theme' | 'all'
export type VisualEffectsMode = 'full' | 'ambient' | 'still'

export interface SoundSettings {
  version: 2
  mode: SoundMode
  volume: number
  themeVolume: number
  gameVolume: number
  ambience: boolean
  sceneEffects: boolean
  ui: boolean
  timer: boolean
  feedback: boolean
  roulette: boolean
  visualEffects: VisualEffectsMode
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  version: 2,
  mode: 'off',
  volume: 0.7,
  themeVolume: 0.55,
  gameVolume: 0.8,
  ambience: true,
  sceneEffects: true,
  ui: true,
  timer: true,
  feedback: true,
  roulette: true,
  visualEffects: 'full',
}

const modes = new Set<SoundMode>(['off', 'theme', 'all'])
const visualModes = new Set<VisualEffectsMode>(['full', 'ambient', 'still'])
const listeners = new Set<() => void>()
let cache: SoundSettings | null = null
let cachedRaw: string | null | undefined
let storageListenerAttached = false

function clamp(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function parseSettings(value: unknown): SoundSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SOUND_SETTINGS
  const parsed = value as Record<string, unknown>
  const legacyEnabled = parsed.enabled
  const mode = modes.has(parsed.mode as SoundMode)
    ? parsed.mode as SoundMode
    : legacyEnabled === true
      ? 'all'
      : 'off'

  return {
    version: 2,
    mode,
    volume: clamp(parsed.volume, DEFAULT_SOUND_SETTINGS.volume),
    themeVolume: clamp(parsed.themeVolume, DEFAULT_SOUND_SETTINGS.themeVolume),
    gameVolume: clamp(parsed.gameVolume, DEFAULT_SOUND_SETTINGS.gameVolume),
    ambience: boolean(parsed.ambience, DEFAULT_SOUND_SETTINGS.ambience),
    sceneEffects: boolean(parsed.sceneEffects, DEFAULT_SOUND_SETTINGS.sceneEffects),
    ui: boolean(parsed.ui, DEFAULT_SOUND_SETTINGS.ui),
    timer: boolean(parsed.timer, DEFAULT_SOUND_SETTINGS.timer),
    feedback: boolean(parsed.feedback, DEFAULT_SOUND_SETTINGS.feedback),
    roulette: boolean(parsed.roulette, DEFAULT_SOUND_SETTINGS.roulette),
    visualEffects: visualModes.has(parsed.visualEffects as VisualEffectsMode)
      ? parsed.visualEffects as VisualEffectsMode
      : DEFAULT_SOUND_SETTINGS.visualEffects,
  }
}

function readStorage() {
  const raw = storageService.get(STORAGE_KEYS.soundSettings)
  if (cache && raw === cachedRaw) return cache
  cachedRaw = raw
  if (!raw) {
    cache = DEFAULT_SOUND_SETTINGS
    return cache
  }

  try {
    cache = parseSettings(JSON.parse(raw))
  } catch {
    cache = DEFAULT_SOUND_SETTINGS
  }
  return cache
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function attachStorageListener() {
  if (storageListenerAttached || typeof window === 'undefined') return
  storageListenerAttached = true
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEYS.soundSettings) return
    cachedRaw = undefined
    cache = null
    emitChange()
  })
}

export function getSoundSettings(): SoundSettings {
  attachStorageListener()
  return readStorage()
}

export function setSoundSettings(patch: Partial<SoundSettings>): SoundSettings {
  const next = parseSettings({ ...getSoundSettings(), ...patch, version: 2 })
  const raw = JSON.stringify(next)
  cache = next
  const persisted = storageService.set(STORAGE_KEYS.soundSettings, raw)
  cachedRaw = persisted ? raw : storageService.get(STORAGE_KEYS.soundSettings)
  emitChange()
  return next
}

export function subscribeSoundSettings(listener: () => void) {
  attachStorageListener()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function themeSoundsEnabled(settings = getSoundSettings()) {
  return settings.mode === 'theme' || settings.mode === 'all'
}

export function gameSoundsEnabled(settings = getSoundSettings()) {
  return settings.mode === 'all'
}
