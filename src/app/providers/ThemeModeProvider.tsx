import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'cinema'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'trivia-theme-mode'

const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: {
    '--color-primary': '#4f46e5',
    '--color-secondary': '#22d3ee',
    '--color-surface': '#f9fafb',
    '--color-background': '#ffffff',
    '--color-border': '#e5e7eb',
    '--color-text': '#111827',
    '--color-muted': '#6b7280',
  },
  dark: {
    '--color-primary': '#6366f1',
    '--color-secondary': '#22d3ee',
    '--color-surface': '#111827',
    '--color-background': '#1f2937',
    '--color-border': '#374151',
    '--color-text': '#f9fafb',
    '--color-muted': '#9ca3af',
  },
  cinema: {
    '--color-primary': '#f97316',
    '--color-secondary': '#fde047',
    '--color-surface': '#1a202c',
    '--color-background': '#12141c',
    '--color-border': '#2d3748',
    '--color-text': '#fefcbf',
    '--color-muted': '#e9d8a6',
  },
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const tokens = themeTokens[mode]
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.dataset.theme = mode
}

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

export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }
  return context
}
