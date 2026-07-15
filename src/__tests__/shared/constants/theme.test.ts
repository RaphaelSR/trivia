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
})
