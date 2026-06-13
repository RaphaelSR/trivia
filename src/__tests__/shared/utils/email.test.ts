/**
 * Testes para src/shared/utils/email.ts
 */

import { isValidEmail } from '@/shared/utils/email'

describe('isValidEmail', () => {
  describe('e-mails válidos', () => {
    it.each([
      'user@example.com',
      'alice@sub.domain.org',
      'foo+bar@baz.io',
      'a@b.cc',
      'user.name@domain.co.uk',
      'raphaelrochabcc@gmail.com',
    ])('aceita %s', (email) => {
      expect(isValidEmail(email)).toBe(true)
    })
  })

  describe('e-mails inválidos', () => {
    it.each([
      '',
      'naotemdominio',
      '@semlocal.com',
      'semtld@dominio',
      'com espaço@domain.com',
      'user @domain.com',
      'user@ domain.com',
      'user@',
      '@',
      'a@b',
    ])('rejeita %s', (email) => {
      expect(isValidEmail(email)).toBe(false)
    })
  })
})
