import {
  DEFAULT_THEME_MODE,
  getDefaultThemeMode,
  THEME_OPTIONS,
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
      'neon-grand-prix',
      'pixel-bomb-arena',
      'shadow-dojo',
      'wasteland-rooftops',
      'enchanted-kingdom',
      'starfighter-battle',
      'moonlit-liner',
      'castaway-island',
      'family-noir',
    ]))
    expect(new Set(THEME_MODES).size).toBe(THEME_MODES.length)
  })

  it('organiza cada tema em uma unica categoria explicita', () => {
    const gameOptions = THEME_OPTIONS.filter((option) => option.category === 'game')
    const cinemaOptions = THEME_OPTIONS.filter((option) => option.category === 'cinema')
    const livingOptions = [...gameOptions, ...cinemaOptions]

    expect(gameOptions.map((option) => option.id)).toEqual([
      'web-city',
      'neon-grand-prix',
      'pixel-bomb-arena',
      'shadow-dojo',
      'wasteland-rooftops',
      'enchanted-kingdom',
      'starfighter-battle',
    ])
    expect(cinemaOptions.map((option) => option.id)).toEqual([
      'deep-space',
      'midnight-cinema',
      'underwater',
      'moonlit-liner',
      'castaway-island',
      'family-noir',
    ])
    expect(livingOptions.every((option) => option.animated && option.cinematic)).toBe(true)
    expect(THEME_OPTIONS.filter((option) => option.cinematic)).toEqual(expect.arrayContaining(livingOptions))
  })
})
