import {
  changeAppLanguage,
  DEFAULT_LANGUAGE,
  i18n,
  SUPPORTED_LANGUAGES,
} from '@/shared/i18n'
import { namespaces, resources } from '@/shared/i18n/resources'
import { STORAGE_KEYS } from '@/shared/constants/storage'

describe('fundação de internacionalização', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEYS.language)
  })

  it('publica todos os namespaces em pt-BR e usa o idioma como fallback', () => {
    expect(DEFAULT_LANGUAGE).toBe('pt-BR')
    expect(SUPPORTED_LANGUAGES).toEqual(['pt-BR'])
    expect(Object.keys(resources['pt-BR'])).toEqual(expect.arrayContaining([...namespaces]))
    expect(i18n.options.fallbackLng).toEqual(['pt-BR'])
  })

  it('traduz por namespace e mantém o idioma do documento sincronizado', async () => {
    await changeAppLanguage('pt-BR')

    expect(i18n.t('landing:game.title')).toBe('Partida completa')
    expect(document.documentElement.lang).toBe('pt-BR')
    expect(window.localStorage.getItem(STORAGE_KEYS.language)).toBe('pt-BR')
  })
})
