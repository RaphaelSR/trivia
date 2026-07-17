import { auth } from './locales/pt-BR/auth'
import { common } from './locales/pt-BR/common'
import { control } from './locales/pt-BR/control'
import { game } from './locales/pt-BR/game'
import { landing } from './locales/pt-BR/landing'

export const DEFAULT_LANGUAGE = 'pt-BR' as const
export const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const resources = {
  [DEFAULT_LANGUAGE]: {
    auth,
    common,
    control,
    game,
    landing,
  },
} as const

export const namespaces = ['auth', 'common', 'control', 'game', 'landing'] as const
