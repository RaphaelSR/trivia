import { THEME_MODES } from '@/shared/constants/theme'
import { THEME_AUDIO_PROFILES } from '@/shared/audio/theme-audio.registry'

describe('theme audio registry', () => {
  it('declara um perfil ambiente para cada tema disponível', () => {
    expect(Object.keys(THEME_AUDIO_PROFILES).sort()).toEqual([...THEME_MODES].sort())
  })
})
