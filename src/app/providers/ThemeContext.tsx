import { createContext } from 'react'
import type { ThemeMode } from '../../shared/types/game'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
