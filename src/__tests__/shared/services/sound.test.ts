import { getSoundSettings, setSoundSettings, DEFAULT_SOUND_SETTINGS } from '@/shared/services/sound-settings'
import { playSound } from '@/shared/services/audio.service'

describe('sound-settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('default é DESLIGADO (opt-in) para não afetar demo/offline', () => {
    expect(DEFAULT_SOUND_SETTINGS.enabled).toBe(false)
  })

  it('persiste e mescla preferências', () => {
    setSoundSettings({ enabled: true, volume: 0.5, timer: false })
    const s = getSoundSettings()
    expect(s.enabled).toBe(true)
    expect(s.volume).toBe(0.5)
    expect(s.timer).toBe(false)
    expect(s.feedback).toBe(true) // não mexido → mantém
    expect(JSON.parse(localStorage.getItem('trivia-sound-settings')!).enabled).toBe(true)
  })

  it('clampa o volume em [0,1]', () => {
    expect(setSoundSettings({ volume: 2 }).volume).toBe(1)
    expect(setSoundSettings({ volume: -1 }).volume).toBe(0)
  })
})

describe('audio.service', () => {
  it('playSound nunca lança (sem AudioContext no jsdom e/ou desligado)', () => {
    setSoundSettings({ enabled: false })
    expect(() => playSound('tick')).not.toThrow()
    setSoundSettings({ enabled: true })
    expect(() => playSound('correct')).not.toThrow()
    expect(() => playSound('timeUp')).not.toThrow()
    expect(() => playSound('wrong')).not.toThrow()
  })
})
