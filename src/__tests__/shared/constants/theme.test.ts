import {
  DEFAULT_THEME_MODE,
  getDefaultThemeMode,
  SEASONAL_THEME_END,
  SEASONAL_THEME_MODE,
  THEME_MODES,
} from '@/shared/constants/theme'

describe('tema padrao sazonal', () => {
  it('usa o tema brazil enquanto a Copa do Mundo 2026 nao termina', () => {
    expect(getDefaultThemeMode(new Date('2026-06-12T12:00:00'))).toBe(SEASONAL_THEME_MODE)
    expect(getDefaultThemeMode(new Date('2026-07-31T23:59:59'))).toBe(SEASONAL_THEME_MODE)
  })

  it('volta ao tema padrao apos o fim da regra temporaria', () => {
    expect(getDefaultThemeMode(new Date('2026-08-01T00:00:00'))).toBe(DEFAULT_THEME_MODE)
    expect(getDefaultThemeMode(new Date('2027-01-01T00:00:00'))).toBe(DEFAULT_THEME_MODE)
  })

  it('mantem ambos os temas validos na lista de modos', () => {
    expect(THEME_MODES).toContain(SEASONAL_THEME_MODE)
    expect(THEME_MODES).toContain(DEFAULT_THEME_MODE)
    expect(SEASONAL_THEME_END.getTime()).toBeGreaterThan(new Date('2026-07-19T00:00:00').getTime())
  })
})
