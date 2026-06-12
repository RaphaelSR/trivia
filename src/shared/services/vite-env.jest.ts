/**
 * Substituto de vite-env.ts no ambiente de testes (mapeado via
 * moduleNameMapper no jest.config.cjs). Lê de process.env, que os testes
 * podem manipular livremente. Não é usado em produção.
 */
export function readViteEnv(key: string): string | undefined {
  return process.env[key]
}
