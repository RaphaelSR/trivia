import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, type ThemeMode } from './themeTokens'
import { ThemeContext } from './ThemeContext'
const STORAGE_KEY = 'trivia-theme-mode'

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return (stored as ThemeMode) || 'light'
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    applyTheme(theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

