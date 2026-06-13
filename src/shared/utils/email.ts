/**
 * Utilitários de validação de e-mail compartilhados.
 * Exportados para reutilização em AuthPanel, TeamsManagementModal e testes.
 */

/**
 * Valida se a string passada tem o formato mínimo de e-mail (user@domain.tld).
 * Não verifica a existência da caixa postal — apenas o formato.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
