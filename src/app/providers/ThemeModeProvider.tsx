import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_THEME_MODE } from '../../shared/constants/theme'
import { STORAGE_KEYS } from '../../shared/constants/storage'
import { storageService } from '../../shared/services/storage.service'
import type { ThemeMode } from '../../shared/types/game'
import { applyTheme } from './themeTokens'
import { ThemeContext } from './ThemeContext'

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME_MODE
    }
    const stored = storageService.get(STORAGE_KEYS.themeMode)
    return (stored as ThemeMode) || DEFAULT_THEME_MODE
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    applyTheme(theme)
    storageService.set(STORAGE_KEYS.themeMode, theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
