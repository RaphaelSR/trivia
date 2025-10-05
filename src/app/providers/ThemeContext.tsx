import { createContext } from 'react'
import type { ThemeMode } from './themeTokens'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
