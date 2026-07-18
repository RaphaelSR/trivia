import explosionUrl from '@/assets/audio/kenney/explosion-crunch-000.ogg?url'
import impactUrl from '@/assets/audio/kenney/impact-metal-000.ogg?url'
import laserUrl from '@/assets/audio/kenney/laser-small-000.ogg?url'
import uiClickUrl from '@/assets/audio/kenney/ui-click-003.ogg?url'
import uiSelectUrl from '@/assets/audio/kenney/ui-select-001.ogg?url'
import { THEME_AUDIO_PROFILES, type AmbientProfile } from '@/shared/audio/theme-audio.registry'
import type { LivingSceneAudioEvent } from '@/shared/theme/living/types'
import type { ThemeMode } from '@/shared/types/game'
import {
  gameSoundsEnabled,
  getSoundSettings,
  subscribeSoundSettings,
  themeSoundsEnabled,
} from './sound-settings'

export type SoundName =
  | 'tick'
  | 'timeUp'
  | 'correct'
  | 'wrong'
  | 'rouletteTick'
  | 'rouletteVictory'
  | 'uiHover'
  | 'uiClick'

type SoundCategory = 'timer' | 'feedback' | 'roulette' | 'ui'
type NoiseColor = 'white' | 'pink' | 'brown'

type AudioGraph = {
  master: GainNode
  game: GainNode
  theme: GainNode
  ambience: GainNode
  scene: GainNode
}

type AmbientHandle = {
  output: GainNode
  profile: AmbientProfile
  sources: AudioScheduledSourceNode[]
}

const SOUND_CATEGORY: Record<SoundName, SoundCategory> = {
  tick: 'timer',
  timeUp: 'timer',
  correct: 'feedback',
  wrong: 'feedback',
  rouletteTick: 'roulette',
  rouletteVictory: 'roulette',
  uiHover: 'ui',
  uiClick: 'ui',
}

const SAMPLE_URLS = {
  explosion: explosionUrl,
  impact: impactUrl,
  laser: laserUrl,
  uiClick: uiClickUrl,
  uiHover: uiSelectUrl,
} as const

type SampleName = keyof typeof SAMPLE_URLS

let context: AudioContext | null = null
let graph: AudioGraph | null = null
let unlocked = false
let desiredTheme: ThemeMode | null = null
let ambient: AmbientHandle | null = null
let settingsSubscribed = false
let visibilitySubscribed = false
let activeVoices = 0
const MAX_VOICES = 24
const noiseBuffers = new Map<NoiseColor, AudioBuffer>()
const sampleBuffers = new Map<SampleName, AudioBuffer>()
const sampleLoads = new Map<SampleName, Promise<void>>()
const sampleFailures = new Map<SampleName, { attempts: number; retryAt: number }>()
const cueTimes = new Map<string, number>()
const gainTargets = new WeakMap<GainNode, number>()
const activeVoiceSources = new Set<AudioScheduledSourceNode>()
let themeDuckUntil = 0
let lifecycleGeneration = 0
let soundscapeGeneration = 0
let suspendTimer: number | null = null
let releaseTimer: number | null = null

function audioConstructor() {
  if (typeof window === 'undefined') return null
  return window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    || null
}

function createContext() {
  if (context) return context
  const Constructor = audioConstructor()
  if (!Constructor) return null
  try {
    context = new Constructor()
    return context
  } catch {
    return null
  }
}

function createGraph(audio: AudioContext) {
  if (graph) return graph
  const master = audio.createGain()
  const game = audio.createGain()
  const theme = audio.createGain()
  const ambienceBus = audio.createGain()
  const scene = audio.createGain()
  const compressor = audio.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 18
  compressor.ratio.value = 4
  compressor.attack.value = 0.005
  compressor.release.value = 0.18
  game.connect(master)
  ambienceBus.connect(theme)
  scene.connect(theme)
  theme.connect(master)
  master.connect(compressor)
  compressor.connect(audio.destination)
  graph = { master, game, theme, ambience: ambienceBus, scene }
  syncGains(true)
  return graph
}

function setGain(node: GainNode, value: number, immediate = false) {
  if (!immediate && gainTargets.get(node) === value) return false
  gainTargets.set(node, value)
  const audio = node.context as AudioContext
  const now = audio.currentTime
  node.gain.cancelScheduledValues(now)
  if (immediate) node.gain.setValueAtTime(value, now)
  else node.gain.setTargetAtTime(value, now, 0.035)
  return true
}

function syncGains(immediate = false) {
  if (!graph) return
  const settings = getSoundSettings()
  setGain(graph.master, settings.mode === 'off' ? 0 : settings.volume, immediate)
  setGain(graph.game, gameSoundsEnabled(settings) ? settings.gameVolume : 0, immediate)
  if (setGain(graph.theme, themeSoundsEnabled(settings) ? settings.themeVolume : 0, immediate)) {
    themeDuckUntil = 0
  }
  setGain(graph.ambience, settings.ambience ? 1 : 0, immediate)
  setGain(graph.scene, settings.sceneEffects ? 1 : 0, immediate)
}

function pageHidden() {
  return typeof document !== 'undefined' && document.hidden
}

function cancelSuspend() {
  if (suspendTimer === null || typeof window === 'undefined') return
  window.clearTimeout(suspendTimer)
  suspendTimer = null
}

function cancelRelease() {
  if (releaseTimer === null || typeof window === 'undefined') return
  window.clearTimeout(releaseTimer)
  releaseTimer = null
}

function stopActiveVoices() {
  activeVoiceSources.forEach((source) => {
    try {
      source.stop(context?.currentTime ?? 0)
    } catch {
      // A voice may already have ended while the page was being deactivated.
    }
  })
  activeVoiceSources.clear()
  activeVoices = 0
}

function scheduleSuspend() {
  if (!context || context.state !== 'running' || typeof window === 'undefined') return
  cancelSuspend()
  const generation = lifecycleGeneration
  suspendTimer = window.setTimeout(() => {
    suspendTimer = null
    if (!context || generation !== lifecycleGeneration || unlocked) return
    try {
      void context.suspend().catch(() => undefined)
    } catch {
      // AudioContext implementations may reject lifecycle operations during teardown.
    }
  }, 450)
}

function deactivateAudio() {
  cancelRelease()
  lifecycleGeneration += 1
  unlocked = false
  syncGains()
  stopAmbient(false)
  stopActiveVoices()
  scheduleSuspend()
}

function ensureSubscriptions() {
  if (!settingsSubscribed) {
    settingsSubscribed = true
    subscribeSoundSettings(() => {
      const settings = getSoundSettings()
      if (settings.mode === 'off' || pageHidden()) {
        deactivateAudio()
        return
      }
      syncGains()
      if (!themeSoundsEnabled(settings) || !settings.ambience) stopAmbient(false)
      else startDesiredAmbient()
    })
  }
  if (!visibilitySubscribed && typeof document !== 'undefined') {
    visibilitySubscribed = true
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) deactivateAudio()
      else syncGains()
    })
  }
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function allowCue(key: string, cooldownMs: number) {
  const now = nowMs()
  const previous = cueTimes.get(key) ?? Number.NEGATIVE_INFINITY
  if (now - previous < cooldownMs) return false
  cueTimes.set(key, now)
  return true
}

function reserveVoice() {
  if (activeVoices >= MAX_VOICES) return false
  activeVoices += 1
  return true
}

function releaseVoice() {
  activeVoices = Math.max(0, activeVoices - 1)
}

function trackVoice(source: AudioScheduledSourceNode) {
  let released = false
  activeVoiceSources.add(source)
  source.onended = () => {
    if (released) return
    released = true
    activeVoiceSources.delete(source)
    releaseVoice()
  }
}

function connectSpatial(node: AudioNode, destination: AudioNode, pan: number) {
  const audio = node.context as AudioContext
  if (typeof audio.createStereoPanner !== 'function') {
    node.connect(destination)
    return null
  }
  const panner = audio.createStereoPanner()
  panner.pan.value = Math.min(1, Math.max(-1, pan))
  node.connect(panner)
  panner.connect(destination)
  return panner
}

function tone(
  destination: AudioNode,
  options: {
    frequency: number
    endFrequency?: number
    duration: number
    delay?: number
    volume?: number
    type?: OscillatorType
    pan?: number
  },
) {
  if (!context || !reserveVoice()) return
  const start = context.currentTime + (options.delay ?? 0)
  const end = start + options.duration
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = options.type ?? 'sine'
  oscillator.frequency.setValueAtTime(Math.max(1, options.frequency), start)
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), end)
  }
  gain.gain.setValueAtTime(Math.max(0.0001, options.volume ?? 0.1), start)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  oscillator.connect(gain)
  connectSpatial(gain, destination, options.pan ?? 0)
  trackVoice(oscillator)
  oscillator.start(start)
  oscillator.stop(end + 0.015)
}

function noiseBuffer(audio: AudioContext, color: NoiseColor) {
  const existing = noiseBuffers.get(color)
  if (existing) return existing
  const length = audio.sampleRate * 6
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let brown = 0
  let pink0 = 0
  let pink1 = 0
  let pink2 = 0
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1
    if (color === 'brown') {
      brown = (brown + 0.018 * white) / 1.018
      data[index] = brown * 3.2
    } else if (color === 'pink') {
      pink0 = 0.99765 * pink0 + white * 0.099046
      pink1 = 0.963 * pink1 + white * 0.296516
      pink2 = 0.57 * pink2 + white * 1.052691
      data[index] = (pink0 + pink1 + pink2 + white * 0.1848) * 0.12
    } else {
      data[index] = white
    }
  }
  const edgeLength = Math.floor(audio.sampleRate * 0.05)
  for (let index = 0; index < edgeLength; index += 1) {
    const envelope = Math.sin((index / edgeLength) * Math.PI / 2)
    data[index] *= envelope
    data[length - 1 - index] *= envelope
  }
  noiseBuffers.set(color, buffer)
  return buffer
}

function noiseBurst(
  destination: AudioNode,
  options: {
    color?: NoiseColor
    duration: number
    delay?: number
    volume?: number
    filterFrequency?: number
    filterType?: BiquadFilterType
    pan?: number
  },
) {
  if (!context || !reserveVoice()) return
  const start = context.currentTime + (options.delay ?? 0)
  const end = start + options.duration
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = noiseBuffer(context, options.color ?? 'white')
  filter.type = options.filterType ?? 'lowpass'
  filter.frequency.value = options.filterFrequency ?? 1000
  gain.gain.setValueAtTime(Math.max(0.0001, options.volume ?? 0.08), start)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  source.connect(filter)
  filter.connect(gain)
  connectSpatial(gain, destination, options.pan ?? 0)
  trackVoice(source)
  source.start(start)
  source.stop(end + 0.015)
}

function playSample(
  name: SampleName,
  destination: AudioNode,
  volume: number,
  pan: number,
  playbackRate = 1,
) {
  if (!context || !reserveVoice()) return false
  const buffer = sampleBuffers.get(name)
  if (!buffer) {
    releaseVoice()
    return false
  }
  const source = context.createBufferSource()
  const gain = context.createGain()
  source.buffer = buffer
  source.playbackRate.value = playbackRate
  gain.gain.value = volume
  source.connect(gain)
  connectSpatial(gain, destination, pan)
  trackVoice(source)
  source.start()
  return true
}

async function loadSample(name: SampleName) {
  if (sampleBuffers.has(name) || sampleLoads.has(name) || typeof fetch !== 'function') return
  const failure = sampleFailures.get(name)
  if (failure && nowMs() < failure.retryAt) return
  const audio = context
  if (!audio) return
  const load = (async () => {
    try {
      const response = await fetch(SAMPLE_URLS[name])
      if (!response.ok) throw new Error('audio asset unavailable')
      const buffer = await response.arrayBuffer()
      sampleBuffers.set(name, await audio.decodeAudioData(buffer))
      sampleFailures.delete(name)
    } catch {
      const attempts = (sampleFailures.get(name)?.attempts ?? 0) + 1
      sampleFailures.set(name, {
        attempts,
        retryAt: nowMs() + Math.min(30_000, 1000 * (2 ** (attempts - 1))),
      })
    }
  })()
  sampleLoads.set(name, load)
  try {
    await load
  } finally {
    if (sampleLoads.get(name) === load) sampleLoads.delete(name)
  }
}

function preloadSamples() {
  void Promise.all((Object.keys(SAMPLE_URLS) as SampleName[]).map(loadSample))
}

function addNoiseLayer(
  audio: AudioContext,
  output: AudioNode,
  sources: AudioScheduledSourceNode[],
  options: {
    color: NoiseColor
    filterType: BiquadFilterType
    frequency: number
    gain: number
    pulseDepth?: number
    pulseRate?: number
  },
) {
  const source = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  source.buffer = noiseBuffer(audio, options.color)
  source.loop = true
  filter.type = options.filterType
  filter.frequency.value = options.frequency
  filter.Q.value = options.filterType === 'bandpass' ? 0.7 : 0.25
  gain.gain.value = options.gain
  source.connect(filter)
  filter.connect(gain)
  gain.connect(output)
  source.start()
  sources.push(source)

  if (options.pulseDepth && options.pulseRate) {
    const lfo = audio.createOscillator()
    const depth = audio.createGain()
    lfo.frequency.value = options.pulseRate
    depth.gain.value = options.pulseDepth
    lfo.connect(depth)
    depth.connect(gain.gain)
    lfo.start()
    sources.push(lfo)
  }
}

function addDrone(
  audio: AudioContext,
  output: AudioNode,
  sources: AudioScheduledSourceNode[],
  frequencies: number[],
  gainValue: number,
  type: OscillatorType = 'sine',
) {
  frequencies.forEach((frequency, index) => {
    const oscillator = audio.createOscillator()
    const filter = audio.createBiquadFilter()
    const gain = audio.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    oscillator.detune.value = index % 2 === 0 ? -4 : 5
    filter.type = 'lowpass'
    filter.frequency.value = Math.max(180, frequency * 4)
    gain.gain.value = gainValue / frequencies.length
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(output)
    oscillator.start()
    sources.push(oscillator)
  })
}

function buildAmbient(profile: AmbientProfile) {
  if (!context || !graph) return null
  const output = context.createGain()
  const sources: AudioScheduledSourceNode[] = []
  output.gain.value = 0.0001
  output.connect(graph.ambience)

  const noise = (options: Parameters<typeof addNoiseLayer>[3]) =>
    addNoiseLayer(context!, output, sources, options)
  const drone = (frequencies: number[], gainValue: number, type?: OscillatorType) =>
    addDrone(context!, output, sources, frequencies, gainValue, type)

  switch (profile) {
    case 'stadium':
      noise({ color: 'pink', filterType: 'bandpass', frequency: 720, gain: 0.024, pulseDepth: 0.008, pulseRate: 0.12 })
      drone([58, 87], 0.009)
      break
    case 'soft':
      noise({ color: 'white', filterType: 'bandpass', frequency: 2600, gain: 0.006, pulseDepth: 0.002, pulseRate: 0.08 })
      drone([196, 294], 0.007)
      break
    case 'city':
      noise({ color: 'pink', filterType: 'bandpass', frequency: 460, gain: 0.018, pulseDepth: 0.005, pulseRate: 0.16 })
      noise({ color: 'white', filterType: 'highpass', frequency: 1800, gain: 0.006 })
      drone([48, 72], 0.012, 'triangle')
      break
    case 'forest':
      noise({ color: 'pink', filterType: 'bandpass', frequency: 1700, gain: 0.011, pulseDepth: 0.004, pulseRate: 0.09 })
      drone([110, 165], 0.005)
      break
    case 'space':
      noise({ color: 'brown', filterType: 'lowpass', frequency: 330, gain: 0.017, pulseDepth: 0.006, pulseRate: 0.055 })
      drone([38, 57, 76], 0.022, 'triangle')
      break
    case 'cinema-rain':
      noise({ color: 'white', filterType: 'highpass', frequency: 1250, gain: 0.015, pulseDepth: 0.004, pulseRate: 0.14 })
      noise({ color: 'brown', filterType: 'lowpass', frequency: 260, gain: 0.009 })
      break
    case 'underwater':
      noise({ color: 'brown', filterType: 'lowpass', frequency: 620, gain: 0.032, pulseDepth: 0.012, pulseRate: 0.1 })
      drone([44, 66], 0.012)
      break
    case 'race':
      noise({ color: 'white', filterType: 'highpass', frequency: 1500, gain: 0.014 })
      noise({ color: 'brown', filterType: 'bandpass', frequency: 170, gain: 0.026, pulseDepth: 0.008, pulseRate: 0.22 })
      drone([52, 78], 0.016, 'sawtooth')
      break
    case 'arcade':
      noise({ color: 'pink', filterType: 'bandpass', frequency: 900, gain: 0.008, pulseDepth: 0.003, pulseRate: 0.3 })
      drone([55, 110], 0.009, 'square')
      break
    case 'dojo':
      noise({ color: 'white', filterType: 'highpass', frequency: 1180, gain: 0.016, pulseDepth: 0.004, pulseRate: 0.13 })
      drone([49, 73.5], 0.009)
      break
    case 'wasteland':
      noise({ color: 'pink', filterType: 'bandpass', frequency: 520, gain: 0.025, pulseDepth: 0.009, pulseRate: 0.07 })
      noise({ color: 'brown', filterType: 'lowpass', frequency: 190, gain: 0.012 })
      break
    case 'fantasy':
      noise({ color: 'white', filterType: 'bandpass', frequency: 2350, gain: 0.008, pulseDepth: 0.003, pulseRate: 0.06 })
      drone([87, 130.5, 174], 0.009)
      break
    case 'ocean':
      noise({ color: 'brown', filterType: 'lowpass', frequency: 880, gain: 0.035, pulseDepth: 0.014, pulseRate: 0.085 })
      noise({ color: 'white', filterType: 'bandpass', frequency: 1650, gain: 0.007, pulseDepth: 0.003, pulseRate: 0.17 })
      break
    case 'island':
      noise({ color: 'brown', filterType: 'lowpass', frequency: 980, gain: 0.038, pulseDepth: 0.015, pulseRate: 0.1 })
      noise({ color: 'pink', filterType: 'bandpass', frequency: 2100, gain: 0.008, pulseDepth: 0.003, pulseRate: 0.075 })
      break
    case 'noir':
      noise({ color: 'white', filterType: 'highpass', frequency: 1150, gain: 0.014, pulseDepth: 0.004, pulseRate: 0.11 })
      noise({ color: 'brown', filterType: 'bandpass', frequency: 260, gain: 0.013 })
      drone([43, 64.5], 0.007)
      break
    case 'neutral':
      noise({ color: 'brown', filterType: 'lowpass', frequency: 420, gain: 0.009, pulseDepth: 0.003, pulseRate: 0.06 })
      break
  }

  output.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.7)
  return { output, profile, sources } satisfies AmbientHandle
}

function stopAmbient(clearDesired: boolean) {
  if (clearDesired) desiredTheme = null
  const current = ambient
  ambient = null
  if (!current || !context) return
  const stopAt = context.currentTime + 0.32
  current.output.gain.cancelScheduledValues(context.currentTime)
  current.output.gain.setTargetAtTime(0.0001, context.currentTime, 0.09)
  current.sources.forEach((source) => {
    try {
      source.stop(stopAt)
    } catch {
      // A source may already have ended during a visibility/theme transition.
    }
  })
  window.setTimeout(() => current.output.disconnect(), 420)
}

function startDesiredAmbient() {
  if (!context || context.state !== 'running' || !graph || !unlocked || !desiredTheme || pageHidden()) return
  const settings = getSoundSettings()
  if (!themeSoundsEnabled(settings) || !settings.ambience) return
  const profile = THEME_AUDIO_PROFILES[desiredTheme]
  if (ambient?.profile === profile) return
  stopAmbient(false)
  ambient = buildAmbient(profile)
}

function gameDestination() {
  return context && graph ? graph.game : null
}

function sceneDestination() {
  return context && graph ? graph.scene : null
}

function duckTheme(duration = 0.35) {
  if (!context || !graph) return
  const settings = getSoundSettings()
  if (!themeSoundsEnabled(settings)) return
  const now = context.currentTime
  const normal = settings.themeVolume
  themeDuckUntil = Math.max(themeDuckUntil, now + duration)
  graph.theme.gain.cancelScheduledValues(now)
  graph.theme.gain.setValueAtTime(Math.max(0.001, graph.theme.gain.value), now)
  graph.theme.gain.linearRampToValueAtTime(normal * 0.48, now + 0.025)
  graph.theme.gain.setTargetAtTime(normal, themeDuckUntil, 0.12)
}

export async function unlockAudio() {
  try {
    if (getSoundSettings().mode === 'off' || pageHidden()) return false
    const generation = lifecycleGeneration
    cancelRelease()
    cancelSuspend()
    const audio = createContext()
    if (!audio) return false
    createGraph(audio)
    ensureSubscriptions()
    if (audio.state !== 'running') await audio.resume()
    if (generation !== lifecycleGeneration || getSoundSettings().mode === 'off' || pageHidden()) {
      unlocked = false
      scheduleSuspend()
      return false
    }
    unlocked = audio.state === 'running'
    if (!unlocked) return false
    syncGains(true)
    preloadSamples()
    startDesiredAmbient()
    return true
  } catch {
    return false
  }
}

export function setThemeSoundscape(theme: ThemeMode) {
  cancelRelease()
  soundscapeGeneration += 1
  desiredTheme = theme
  ensureSubscriptions()
  syncGains()
  startDesiredAmbient()
}

export function stopThemeSoundscape() {
  cancelRelease()
  soundscapeGeneration += 1
  stopAmbient(true)
}

export function releaseAudioSession() {
  stopAmbient(true)
  soundscapeGeneration += 1
  if (!context || typeof window === 'undefined') return
  cancelRelease()
  const generation = soundscapeGeneration
  releaseTimer = window.setTimeout(() => {
    releaseTimer = null
    if (!context || generation !== soundscapeGeneration || desiredTheme) return
    lifecycleGeneration += 1
    unlocked = false
    stopActiveVoices()
    try {
      void context.suspend().catch(() => undefined)
    } catch {
      // AudioContext implementations may reject lifecycle operations during teardown.
    }
  }, 450)
}

export function playSound(name: SoundName) {
  try {
    const settings = getSoundSettings()
    const category = SOUND_CATEGORY[name]
    if (!gameSoundsEnabled(settings) || !settings[category] || !unlocked || pageHidden()) return
    const destination = gameDestination()
    if (!destination || !context || context.state !== 'running') return
    syncGains()
    if ((name === 'uiHover' && !allowCue('ui-hover', 45)) || (name === 'uiClick' && !allowCue('ui-click', 35))) return
    if (category !== 'ui') {
      duckTheme(name === 'timeUp' || name === 'correct' || name === 'wrong' ? 0.42 : 0.18)
    }

    switch (name) {
      case 'tick':
        tone(destination, { frequency: 880, duration: 0.055, volume: 0.11 })
        break
      case 'timeUp':
        tone(destination, { frequency: 440, endFrequency: 350, duration: 0.18, volume: 0.12 })
        tone(destination, { frequency: 330, endFrequency: 245, duration: 0.32, delay: 0.15, volume: 0.13 })
        break
      case 'correct':
        ;[523, 659, 784].forEach((frequency, index) => tone(destination, {
          frequency,
          duration: index === 2 ? 0.28 : 0.16,
          delay: index * 0.095,
          volume: 0.105,
        }))
        break
      case 'wrong':
        tone(destination, { frequency: 190, endFrequency: 118, duration: 0.32, volume: 0.11, type: 'sawtooth' })
        noiseBurst(destination, { duration: 0.16, volume: 0.035, filterFrequency: 700 })
        break
      case 'rouletteTick':
        tone(destination, { frequency: 900 + Math.random() * 180, duration: 0.035, volume: 0.075 })
        break
      case 'rouletteVictory':
        ;[523, 659, 784, 1047].forEach((frequency, index) => tone(destination, {
          frequency,
          duration: 0.3,
          delay: index * 0.11,
          volume: 0.105,
        }))
        break
      case 'uiHover':
        if (!playSample('uiHover', destination, 0.12, 0, 0.96)) {
          tone(destination, { frequency: 1240, duration: 0.022, volume: 0.025 })
        }
        break
      case 'uiClick':
        if (!playSample('uiClick', destination, 0.17, 0)) {
          tone(destination, { frequency: 720, endFrequency: 580, duration: 0.026, volume: 0.035 })
        }
        break
    }
  } catch {
    // Audio is decorative and must never interrupt the game.
  }
}

const cueCooldown: Record<LivingSceneAudioEvent['cue'], number> = {
  'race-boost': 480,
  'race-lap': 700,
  'bomb-place': 120,
  explosion: 150,
  'combat-strike': 260,
  thunder: 4500,
  'drone-scan': 500,
  flare: 900,
  magic: 700,
  flyby: 900,
  laser: 105,
  impact: 115,
  'jump-in': 700,
  broadside: 1000,
  'deck-swell': 2500,
  'ice-crack': 850,
  'ocean-accent': 1200,
  'fire-gust': 850,
  'vehicle-pass': 1600,
  'lamp-flicker': 600,
}

function renderThemeCue(event: LivingSceneAudioEvent, bypassRateLimit = false) {
  const destination = sceneDestination()
  if (!destination || !context) return
  const x = event.x ?? 0.5
  const pan = x * 2 - 1
  const intensity = Math.min(1, Math.max(0.15, event.intensity ?? 0.65))
  const key = `${event.cue}:${event.sourceId ?? 'global'}`
  if (!bypassRateLimit && !allowCue(key, cueCooldown[event.cue])) return

  switch (event.cue) {
    case 'race-boost':
      tone(destination, { frequency: 72, endFrequency: 210, duration: 0.42, volume: 0.055 * intensity, type: 'sawtooth', pan })
      noiseBurst(destination, { color: 'pink', duration: 0.26, volume: 0.035 * intensity, filterFrequency: 850, filterType: 'bandpass', pan })
      break
    case 'race-lap':
      ;[659, 880].forEach((frequency, index) => tone(destination, { frequency, duration: 0.12, delay: index * 0.075, volume: 0.055 * intensity, pan }))
      break
    case 'bomb-place':
      tone(destination, { frequency: 270, endFrequency: 190, duration: 0.075, volume: 0.065 * intensity, type: 'square', pan })
      break
    case 'explosion':
    case 'broadside':
      playSample('explosion', destination, 0.18 * intensity, pan, event.cue === 'broadside' ? 0.72 : 0.92 + intensity * 0.12)
      noiseBurst(destination, { color: 'brown', duration: event.cue === 'broadside' ? 0.75 : 0.48, volume: 0.11 * intensity, filterFrequency: 420, pan })
      tone(destination, { frequency: 92, endFrequency: 38, duration: 0.5, volume: 0.08 * intensity, type: 'triangle', pan })
      break
    case 'combat-strike':
      noiseBurst(destination, { duration: 0.12, volume: 0.06 * intensity, filterFrequency: 1250, filterType: 'bandpass', pan })
      tone(destination, { frequency: 240, endFrequency: 95, duration: 0.14, volume: 0.045 * intensity, pan })
      break
    case 'thunder':
      noiseBurst(destination, { color: 'brown', duration: 1.35, volume: 0.12 * intensity, filterFrequency: 520, pan })
      tone(destination, { frequency: 58, endFrequency: 31, duration: 1.1, volume: 0.065 * intensity, type: 'triangle', pan })
      break
    case 'drone-scan':
      tone(destination, { frequency: 520, endFrequency: 1450, duration: 0.24, volume: 0.045 * intensity, type: 'sine', pan })
      break
    case 'flare':
      noiseBurst(destination, { color: 'pink', duration: 0.42, volume: 0.045 * intensity, filterFrequency: 1600, filterType: 'highpass', pan })
      tone(destination, { frequency: 180, endFrequency: 660, duration: 0.35, volume: 0.035 * intensity, pan })
      break
    case 'magic':
      ;[523, 784, 1175].forEach((frequency, index) => tone(destination, { frequency, duration: 0.42, delay: index * 0.07, volume: 0.036 * intensity, type: 'sine', pan }))
      break
    case 'flyby':
    case 'jump-in':
      tone(destination, { frequency: event.cue === 'jump-in' ? 95 : 460, endFrequency: event.cue === 'jump-in' ? 620 : 120, duration: 0.5, volume: 0.06 * intensity, type: 'sawtooth', pan })
      noiseBurst(destination, { color: 'pink', duration: 0.32, volume: 0.028 * intensity, filterFrequency: 1200, filterType: 'bandpass', pan })
      break
    case 'laser':
      if (!playSample('laser', destination, 0.16 * intensity, pan, 0.92 + intensity * 0.18)) {
        tone(destination, { frequency: 1500, endFrequency: 260, duration: 0.16, volume: 0.065 * intensity, type: 'sawtooth', pan })
      }
      break
    case 'impact':
      playSample('impact', destination, 0.16 * intensity, pan, 0.88 + intensity * 0.18)
      noiseBurst(destination, { duration: 0.11, volume: 0.055 * intensity, filterFrequency: 720, pan })
      tone(destination, { frequency: 145, endFrequency: 72, duration: 0.16, volume: 0.05 * intensity, pan })
      break
    case 'deck-swell':
      tone(destination, { frequency: 73, endFrequency: 67, duration: 1.25, volume: 0.045 * intensity, type: 'triangle', pan })
      tone(destination, { frequency: 110, endFrequency: 98, duration: 1.05, delay: 0.08, volume: 0.022 * intensity, pan })
      break
    case 'ice-crack':
      noiseBurst(destination, { duration: 0.18, volume: 0.045 * intensity, filterFrequency: 2700, filterType: 'highpass', pan })
      tone(destination, { frequency: 2100, endFrequency: 680, duration: 0.16, volume: 0.026 * intensity, type: 'triangle', pan })
      break
    case 'ocean-accent':
      noiseBurst(destination, { color: 'brown', duration: 0.85, volume: 0.06 * intensity, filterFrequency: 950, pan })
      break
    case 'fire-gust':
      noiseBurst(destination, { color: 'pink', duration: 0.42, volume: 0.05 * intensity, filterFrequency: 1550, filterType: 'bandpass', pan })
      break
    case 'vehicle-pass':
      tone(destination, { frequency: 165, endFrequency: 58, duration: 0.9, volume: 0.055 * intensity, type: 'sawtooth', pan })
      noiseBurst(destination, { color: 'brown', duration: 0.72, volume: 0.045 * intensity, filterFrequency: 420, pan })
      break
    case 'lamp-flicker':
      tone(destination, { frequency: 1850, endFrequency: 920, duration: 0.035, volume: 0.018 * intensity, type: 'square', pan })
      break
  }
}

export function playThemeAudioEvent(theme: ThemeMode, event: LivingSceneAudioEvent) {
  try {
    const settings = getSoundSettings()
    if (!unlocked || pageHidden() || !themeSoundsEnabled(settings) || !settings.sceneEffects) return
    if (!context || context.state !== 'running') return
    if (desiredTheme && desiredTheme !== theme) return
    desiredTheme = theme
    syncGains()
    renderThemeCue(event)
  } catch {
    // Decorative scene audio never interrupts rendering.
  }
}

export function previewThemeAudio(theme: ThemeMode) {
  const generation = soundscapeGeneration
  void unlockAudio().then((ready) => {
    if (!ready || generation !== soundscapeGeneration || pageHidden()) return
    const profile = THEME_AUDIO_PROFILES[theme]
    const cue: LivingSceneAudioEvent =
      profile === 'race' ? { cue: 'race-boost', x: 0.58, intensity: 0.78 }
        : profile === 'arcade' ? { cue: 'explosion', x: 0.5, intensity: 0.58 }
          : profile === 'space' ? { cue: 'flyby', x: 0.76, intensity: 0.68 }
            : profile === 'dojo' ? { cue: 'combat-strike', x: 0.5, intensity: 0.68 }
              : profile === 'wasteland' ? { cue: 'thunder', x: 0.62, intensity: 0.58 }
                : profile === 'fantasy' ? { cue: 'magic', x: 0.72, intensity: 0.72 }
                  : profile === 'ocean' ? { cue: 'deck-swell', x: 0.48, intensity: 0.62 }
                    : profile === 'island' ? { cue: 'fire-gust', x: 0.28, intensity: 0.68 }
                      : profile === 'noir' ? { cue: 'vehicle-pass', x: 0.82, intensity: 0.56 }
                        : { cue: 'magic', x: 0.5, intensity: 0.42 }
    renderThemeCue(cue, true)
    if (desiredTheme === theme) startDesiredAmbient()
  })
}
