/**
 * audio.service
 *
 * Sons sintetizados via Web Audio (sem arquivos — supply-chain safe, mesmo
 * padrão do FilmRoulette). `playSound(name)` é no-op quando os sons estão
 * desligados ou a categoria do som está desativada. Nunca lança.
 *
 * Categorias: 'timer' (tick, timeUp) e 'feedback' (correct, wrong).
 */

import { getSoundSettings } from './sound-settings'

export type SoundName = 'tick' | 'timeUp' | 'correct' | 'wrong'

const CATEGORY: Record<SoundName, 'timer' | 'feedback'> = {
  tick: 'timer',
  timeUp: 'timer',
  correct: 'feedback',
  wrong: 'feedback',
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    return ctx
  } catch {
    return null
  }
}

/** Toca uma sequência de tons (freq Hz, dur s) a partir de um ganho mestre. */
function tone(
  audio: AudioContext,
  notes: Array<{ freq: number; start: number; dur: number; type?: OscillatorType }>,
  masterVolume: number,
) {
  for (const note of notes) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.type = note.type ?? 'sine'
    osc.frequency.value = note.freq
    const t = audio.currentTime + note.start
    gain.gain.setValueAtTime(Math.max(0.0001, masterVolume * 0.18), t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur)
    osc.start(t)
    osc.stop(t + note.dur)
  }
}

/**
 * Toca um som nomeado, respeitando as preferências (enabled + categoria + volume).
 * Fire-and-forget, nunca lança.
 */
export function playSound(name: SoundName): void {
  try {
    const settings = getSoundSettings()
    if (!settings.enabled) return
    if (!settings[CATEGORY[name]]) return

    const audio = getCtx()
    if (!audio) return
    // Autoplay policy: o contexto pode estar suspenso até a 1ª interação.
    if (audio.state === 'suspended') void audio.resume()

    const v = settings.volume
    switch (name) {
      case 'tick':
        tone(audio, [{ freq: 880, start: 0, dur: 0.06 }], v)
        break
      case 'timeUp':
        tone(audio, [
          { freq: 440, start: 0, dur: 0.18 },
          { freq: 330, start: 0.16, dur: 0.28 },
        ], v)
        break
      case 'correct':
        tone(audio, [
          { freq: 523, start: 0, dur: 0.15 },
          { freq: 659, start: 0.1, dur: 0.15 },
          { freq: 784, start: 0.2, dur: 0.25 },
        ], v)
        break
      case 'wrong':
        tone(audio, [{ freq: 180, start: 0, dur: 0.3, type: 'sawtooth' }], v)
        break
    }
  } catch {
    /* nunca quebra o jogo por causa de som */
  }
}
