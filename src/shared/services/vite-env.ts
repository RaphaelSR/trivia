/**
 * Único ponto do código de produção que toca import.meta.env (sintaxe
 * exclusiva do Vite, inválida em CommonJS). Nos testes, o Jest substitui
 * este módulo por vite-env.jest.ts via moduleNameMapper — assim qualquer
 * arquivo pode importar o cliente Supabase sem quebrar a compilação CJS.
 */
export function readViteEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key]
}
