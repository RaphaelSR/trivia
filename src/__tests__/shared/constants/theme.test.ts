import {
  DEFAULT_THEME_MODE,
  getDefaultThemeMode,
  THEME_MODES,
} from '@/shared/constants/theme'

describe('tema padrao', () => {
  it('usa light como default compartilhado do produto', () => {
    expect(DEFAULT_THEME_MODE).toBe('light')
    expect(getDefaultThemeMode()).toBe('light')
  })

  it('mantem light e brazil como temas validos', () => {
    expect(THEME_MODES).toContain(DEFAULT_THEME_MODE)
    expect(THEME_MODES).toContain('brazil')
  })

  it('inclui os cenarios novos no catalogo canonico', () => {
    expect(THEME_MODES).toEqual(expect.arrayContaining([
      'world-cup-2026',
      'kawaii',
      'neon-city',
      'storybook',
      'web-city',
      'deep-space',
      'midnight-cinema',
      'underwater',
    ]))
    expect(new Set(THEME_MODES).size).toBe(THEME_MODES.length)
  })
})
