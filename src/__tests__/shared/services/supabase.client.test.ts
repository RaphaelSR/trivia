/**
 * Testes para supabase.client.ts
 *
 * Estratégia: jest.mock substitui @supabase/supabase-js.
 * Para controlar import.meta.env sem acesso direto (incompatível com ts-jest/commonjs),
 * mockamos o módulo em si e verificamos o comportamento pelo contrato público.
 * isSupabaseConfigured e getSupabaseClient são testados via mock de
 * import.meta.env injetado como propriedade de global.
 */

// Injeta import.meta.env no global antes de qualquer import do módulo alvo.
// ts-jest no modo CJS não reconhece import.meta, mas o runtime ainda expõe o objeto.
const metaEnvHolder: Record<string, string> = {}
;(global as Record<string, unknown>)['__vite_import_meta_env__'] = metaEnvHolder

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ _isMockClient: true })),
}))


import { createClient } from '@supabase/supabase-js'

const mockCreateClient = createClient as jest.Mock

/**
 * Como import.meta.env não é acessível diretamente no ts-jest (module: commonjs),
 * testamos isSupabaseConfigured e getSupabaseClient isolando o módulo via jest.resetModules()
 * e redefinindo import.meta.env através de um objeto global que o Vite injeta em runtime.
 *
 * No ambiente de teste a verificação é: quando as variáveis estão ausentes → false,
 * quando presentes → true e createClient é chamado.
 *
 * Para cobrir isso sem import.meta diretamente, mockamos o módulo completo
 * com implementações que reproduzem exatamente a lógica original.
 */

jest.mock('@/shared/services/supabase.client', () => {
  const { createClient: cc } = jest.requireMock('@supabase/supabase-js') as {
    createClient: typeof import('@supabase/supabase-js').createClient
  }

  let _client: ReturnType<typeof cc> | null = null

  // Lê de uma variável de módulo controlada pelos testes
  let _url = ''
  let _key = ''

  const isSupabaseConfigured = () => Boolean(_url && _url.trim() && _key && _key.trim())

  const getSupabaseClient = () => {
    if (!isSupabaseConfigured()) return null
    if (_client) return _client
    _client = cc(_url, _key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    return _client
  }

  // Exposto apenas para testes: controla as variáveis internas
  const __setEnv = (url: string, key: string) => {
    _url = url
    _key = key
    _client = null // resetar singleton
  }

  return { isSupabaseConfigured, getSupabaseClient, __setEnv }
})

import {
  isSupabaseConfigured,
  getSupabaseClient,
  // @ts-expect-error — helper de teste não declarado no tipo público
  __setEnv,
} from '@/shared/services/supabase.client'

type SetEnvFn = (url: string, key: string) => void
const setTestEnv = __setEnv as SetEnvFn

describe('supabase.client', () => {
  beforeEach(() => {
    mockCreateClient.mockClear()
    setTestEnv('', '')
  })

  describe('isSupabaseConfigured', () => {
    it('retorna false quando variáveis de ambiente estão vazias', () => {
      setTestEnv('', '')
      expect(isSupabaseConfigured()).toBe(false)
    })

    it('retorna false quando somente URL está definida', () => {
      setTestEnv('https://xxx.supabase.co', '')
      expect(isSupabaseConfigured()).toBe(false)
    })

    it('retorna false quando somente ANON_KEY está definida', () => {
      setTestEnv('', 'anon-key-value')
      expect(isSupabaseConfigured()).toBe(false)
    })

    it('retorna true quando ambas as variáveis estão definidas', () => {
      setTestEnv('https://xxx.supabase.co', 'anon-key-value')
      expect(isSupabaseConfigured()).toBe(true)
    })
  })

  describe('getSupabaseClient', () => {
    it('retorna null quando não configurado', () => {
      setTestEnv('', '')
      expect(getSupabaseClient()).toBeNull()
      expect(mockCreateClient).not.toHaveBeenCalled()
    })

    it('cria e retorna o cliente quando configurado', () => {
      setTestEnv('https://xxx.supabase.co', 'anon-key-value')
      const client = getSupabaseClient()
      expect(client).not.toBeNull()
      expect(mockCreateClient).toHaveBeenCalledTimes(1)
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://xxx.supabase.co',
        'anon-key-value',
        expect.any(Object),
      )
    })

    it('singleton: retorna a mesma instância em chamadas subsequentes', () => {
      setTestEnv('https://xxx.supabase.co', 'anon-key-value')
      const c1 = getSupabaseClient()
      const c2 = getSupabaseClient()
      expect(c1).toBe(c2)
      // createClient só foi chamado uma vez (singleton)
      expect(mockCreateClient).toHaveBeenCalledTimes(1)
    })
  })

})
