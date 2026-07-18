import { themeTokens } from '@/app/providers/themeTokens'
import { THEME_MODES } from '@/shared/constants/theme'

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('themeTokens', () => {
  it.each(THEME_MODES)('mantem o conjunto completo de tokens em %s', (theme) => {
    expect(Object.keys(themeTokens[theme]).sort()).toEqual(Object.keys(themeTokens.light).sort())
    expect(themeTokens[theme]['--theme-backdrop']).toBeTruthy()
    expect(themeTokens[theme]['--surface-glass-bg']).toBeTruthy()
    expect(themeTokens[theme]['--color-text']).toBeTruthy()
  })

  it.each(THEME_MODES)('mantem contraste AA sobre o primario em %s', (theme) => {
    expect(
      contrastRatio(
        themeTokens[theme]['--color-primary'],
        themeTokens[theme]['--color-on-primary'],
      ),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
