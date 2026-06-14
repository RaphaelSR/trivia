/**
 * sound-settings
 *
 * Preferências de som (T9), persistidas no localStorage. Cache em memória para
 * leitura barata na hora de tocar (eventos de som são frequentes, ex. tick).
 *
 * Default: DESLIGADO (opt-in) — assim os modos demo/offline não mudam de
 * comportamento até o usuário ativar os sons na seção "Sons".
 */

const STORAGE_KEY = 'trivia-sound-settings'

export interface SoundSettings {
  /** Liga/desliga global. Default false (opt-in). */
  enabled: boolean
  /** Volume 0..1. */
  volume: number
  /** Sons do cronômetro (tique nos últimos segundos + fim do tempo). */
  timer: boolean
  /** Sons de feedback de resposta (acerto / erro-anulação). */
  feedback: boolean
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: false,
  volume: 0.7,
  timer: true,
  feedback: true,
}

let cache: SoundSettings | null = null

function readStorage(): SoundSettings {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SOUND_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SOUND_SETTINGS
    const parsed = JSON.parse(raw) as Partial<SoundSettings>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SOUND_SETTINGS.enabled,
      volume: typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_SOUND_SETTINGS.volume,
      timer: typeof parsed.timer === 'boolean' ? parsed.timer : DEFAULT_SOUND_SETTINGS.timer,
      feedback: typeof parsed.feedback === 'boolean' ? parsed.feedback : DEFAULT_SOUND_SETTINGS.feedback,
    }
  } catch {
    return DEFAULT_SOUND_SETTINGS
  }
}

export function getSoundSettings(): SoundSettings {
  if (!cache) cache = readStorage()
  return cache
}

export function setSoundSettings(patch: Partial<SoundSettings>): SoundSettings {
  const next = { ...getSoundSettings(), ...patch }
  next.volume = Math.min(1, Math.max(0, next.volume))
  cache = next
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota/private-mode errors */
    }
  }
  return next
}
