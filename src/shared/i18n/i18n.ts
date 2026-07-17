import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { STORAGE_KEYS } from '@/shared/constants/storage'
import { storageService } from '@/shared/services/storage.service'
import {
  DEFAULT_LANGUAGE,
  namespaces,
  resources,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from './resources'

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

function readInitialLanguage(): AppLanguage {
  const stored = storageService.get(STORAGE_KEYS.language)
  return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: readInitialLanguage(),
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...namespaces],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      returnNull: false,
    })
}

function applyDocumentLanguage(language: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

applyDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE)
i18n.on('languageChanged', (language) => {
  if (isSupportedLanguage(language)) storageService.set(STORAGE_KEYS.language, language)
  applyDocumentLanguage(language)
})

export async function changeAppLanguage(language: AppLanguage) {
  await i18n.changeLanguage(language)
}

export { i18n }
