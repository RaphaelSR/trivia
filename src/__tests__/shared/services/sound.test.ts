import { STORAGE_KEYS } from '@/shared/constants/storage'
import {
  playSound,
  playThemeAudioEvent,
  previewThemeAudio,
  releaseAudioSession,
  setThemeSoundscape,
  unlockAudio,
} from '@/shared/services/audio.service'
import {
  DEFAULT_SOUND_SETTINGS,
  getSoundSettings,
  setSoundSettings,
  subscribeSoundSettings,
} from '@/shared/services/sound-settings'

describe('sound-settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('começa desligado e exige opt-in', () => {
    expect(DEFAULT_SOUND_SETTINGS.mode).toBe('off')
    expect(getSoundSettings().mode).toBe('off')
  })

  it('persiste e mescla preferências v2', () => {
    setSoundSettings({ mode: 'theme', volume: 0.5, timer: false })
    const settings = getSoundSettings()

    expect(settings.mode).toBe('theme')
    expect(settings.volume).toBe(0.5)
    expect(settings.timer).toBe(false)
    expect(settings.feedback).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.soundSettings)!).version).toBe(2)
  })

  it('migra as preferências antigas sem perder volume e categorias', () => {
    localStorage.setItem(STORAGE_KEYS.soundSettings, JSON.stringify({
      enabled: true,
      volume: 0.42,
      timer: false,
      feedback: true,
    }))

    expect(getSoundSettings()).toMatchObject({
      version: 2,
      mode: 'all',
      volume: 0.42,
      timer: false,
      feedback: true,
    })

    localStorage.setItem(STORAGE_KEYS.soundSettings, JSON.stringify({ enabled: false }))
    expect(getSoundSettings().mode).toBe('off')
  })

  it('clampa todos os volumes em [0,1]', () => {
    expect(setSoundSettings({ volume: 2, themeVolume: -1, gameVolume: 4 })).toMatchObject({
      volume: 1,
      themeVolume: 0,
      gameVolume: 1,
    })
  })

  it('notifica consumidores na mesma aba', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeSoundSettings(listener)
    setSoundSettings({ mode: 'all' })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})

describe('audio.service', () => {
  it('nunca lança quando o contexto ainda não foi desbloqueado', () => {
    setSoundSettings({ mode: 'off' })
    expect(() => playSound('tick')).not.toThrow()
    setSoundSettings({ mode: 'all' })
    expect(() => playSound('correct')).not.toThrow()
    expect(() => playSound('rouletteTick')).not.toThrow()
    expect(() => playSound('uiHover')).not.toThrow()
  })

  it('ignora com segurança eventos de cena sem AudioContext', () => {
    setSoundSettings({ mode: 'theme' })
    expect(() => playThemeAudioEvent('starfighter-battle', {
      cue: 'laser',
      x: 0.75,
      intensity: 0.8,
    })).not.toThrow()
  })

  it('monta o grafo, inicia ambiência e toca cues depois de gesto explícito', async () => {
    const originalAudioContext = window.AudioContext
    const originalFetch = global.fetch
    const audio = new MockAudioContext()
    let hidden = false
    const hiddenSpy = jest.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    jest.useFakeTimers()
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: jest.fn(() => audio),
    })
    global.fetch = jest.fn().mockRejectedValue(new Error('asset não carregado no teste'))
    setSoundSettings({ mode: 'all', ambience: true, sceneEffects: true })

    try {
      await expect(unlockAudio()).resolves.toBe(true)
      expect(() => setThemeSoundscape('starfighter-battle')).not.toThrow()
      expect(() => playThemeAudioEvent('starfighter-battle', {
        cue: 'laser',
        x: 0.8,
        intensity: 0.7,
      })).not.toThrow()
      expect(audio.createDynamicsCompressor).toHaveBeenCalledTimes(1)
      expect(audio.createStereoPanner).toHaveBeenCalled()
      expect(audio.createOscillator).toHaveBeenCalled()

      const themeGain = (audio.createGain.mock.results[2].value as GainNode).gain
      const cancelThemeAutomation = themeGain.cancelScheduledValues as jest.Mock
      const cancellationsBeforeUi = cancelThemeAutomation.mock.calls.length
      playSound('uiClick')
      expect(cancelThemeAutomation).toHaveBeenCalledTimes(cancellationsBeforeUi)
      playSound('correct')
      expect(cancelThemeAutomation.mock.calls.length).toBeGreaterThan(cancellationsBeforeUi)

      previewThemeAudio('enchanted-kingdom')
      setThemeSoundscape('starfighter-battle')
      const oscillatorsAfterThemeChange = audio.createOscillator.mock.calls.length
      await Promise.resolve()
      await Promise.resolve()
      expect(audio.createOscillator).toHaveBeenCalledTimes(oscillatorsAfterThemeChange)

      await Promise.resolve()
      const firstFetchCount = (global.fetch as jest.Mock).mock.calls.length
      jest.advanceTimersByTime(1100)
      await expect(unlockAudio()).resolves.toBe(true)
      await Promise.resolve()
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(firstFetchCount)

      hidden = true
      document.dispatchEvent(new Event('visibilitychange'))
      const oscillatorsBeforeHiddenPlay = audio.createOscillator.mock.calls.length
      playSound('correct')
      expect(audio.createOscillator).toHaveBeenCalledTimes(oscillatorsBeforeHiddenPlay)

      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
      playSound('correct')
      expect(audio.createOscillator).toHaveBeenCalledTimes(oscillatorsBeforeHiddenPlay)

      jest.advanceTimersByTime(451)
      await Promise.resolve()
      expect(audio.suspend).toHaveBeenCalledTimes(1)
      expect(audio.state).toBe('suspended')

      await expect(unlockAudio()).resolves.toBe(true)
      expect(audio.resume).toHaveBeenCalledTimes(2)
      playSound('correct')
      expect(audio.createOscillator.mock.calls.length).toBeGreaterThan(oscillatorsBeforeHiddenPlay)

      releaseAudioSession()
      jest.advanceTimersByTime(451)
      await Promise.resolve()
      expect(audio.suspend).toHaveBeenCalledTimes(2)
    } finally {
      hiddenSpy.mockRestore()
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: originalAudioContext,
      })
      global.fetch = originalFetch
      jest.useRealTimers()
    }
  })
})

function parameter(value = 0) {
  return {
    value,
    cancelScheduledValues: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    setTargetAtTime: jest.fn(),
    setValueAtTime: jest.fn(),
  } as unknown as AudioParam
}

class MockAudioContext {
  currentTime = 0
  destination = { connect: jest.fn() } as unknown as AudioDestinationNode
  sampleRate = 44_100
  state: AudioContextState = 'suspended'

  createBiquadFilter = jest.fn(() => this.node({
    frequency: parameter(),
    Q: parameter(),
    type: 'lowpass',
  }) as unknown as BiquadFilterNode)

  createBuffer = jest.fn((_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  }) as unknown as AudioBuffer)

  createBufferSource = jest.fn(() => this.node({
    buffer: null,
    loop: false,
    onended: null,
    playbackRate: parameter(1),
    start: jest.fn(),
    stop: jest.fn(),
  }) as unknown as AudioBufferSourceNode)

  createDynamicsCompressor = jest.fn(() => this.node({
    attack: parameter(),
    knee: parameter(),
    ratio: parameter(),
    release: parameter(),
    threshold: parameter(),
  }) as unknown as DynamicsCompressorNode)

  createGain = jest.fn(() => this.node({ gain: parameter(1) }) as unknown as GainNode)

  createOscillator = jest.fn(() => this.node({
    detune: parameter(),
    frequency: parameter(),
    onended: null,
    start: jest.fn(),
    stop: jest.fn(),
    type: 'sine',
  }) as unknown as OscillatorNode)

  createStereoPanner = jest.fn(() => this.node({ pan: parameter() }) as unknown as StereoPannerNode)
  decodeAudioData = jest.fn(async () => ({} as AudioBuffer))
  resume = jest.fn(async () => {
    this.state = 'running'
  })

  suspend = jest.fn(async () => {
    this.state = 'suspended'
  })

  private node(properties: Record<string, unknown>) {
    return {
      connect: jest.fn(),
      context: this,
      disconnect: jest.fn(),
      ...properties,
    }
  }
}
