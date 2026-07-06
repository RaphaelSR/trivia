import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDefaultThemeMode, THEME_MODES } from '../../shared/constants/theme'
import { STORAGE_KEYS } from '../../shared/constants/storage'
import { storageService } from '../../shared/services/storage.service'
import type { ThemeMode } from '../../shared/types/game'
import { applyTheme } from './themeTokens'
import { ThemeContext } from './ThemeContext'

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return getDefaultThemeMode()
    }
    const stored = storageService.get(STORAGE_KEYS.themeMode)
    if (stored && THEME_MODES.includes(stored as ThemeMode)) {
      return stored as ThemeMode
    }
    return getDefaultThemeMode()
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    applyTheme(theme)
  }, [theme])

  // Persiste apenas escolhas explicitas: quem nunca escolheu tema acompanha o
  // padrão sazonal e volta ao padrão normal quando a regra temporária expirar.
  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme)
    storageService.set(STORAGE_KEYS.themeMode, nextTheme)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
