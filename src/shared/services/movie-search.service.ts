export type MovieSuggestion = {
  id: string
  title: string
  year?: number
}

type ItunesMovieResult = {
  trackId?: number
  trackName?: string
  releaseDate?: string
  kind?: string
}

type ItunesSearchResponse = {
  results?: ItunesMovieResult[]
}

const ITUNES_SEARCH_ENDPOINT = 'https://itunes.apple.com/search'

type ItunesJsonpGlobal = typeof globalThis & {
  [callbackName: string]: ((payload: ItunesSearchResponse) => void) | unknown
}

function normalizeMovieSuggestions(payload: ItunesSearchResponse): MovieSuggestion[] {
  const uniqueSuggestions = new Map<string, MovieSuggestion>()

  for (const result of payload.results ?? []) {
    if (result.kind !== 'feature-movie') continue

    const title = result.trackName?.trim()
    if (!title) continue

    const parsedYear = result.releaseDate ? new Date(result.releaseDate).getUTCFullYear() : undefined
    const year = parsedYear && Number.isFinite(parsedYear) ? parsedYear : undefined
    const key = `${title.toLocaleLowerCase('pt-BR')}::${year ?? ''}`

    if (!uniqueSuggestions.has(key)) {
      uniqueSuggestions.set(key, {
        id: result.trackId ? String(result.trackId) : key,
        title,
        year,
      })
    }
  }

  return Array.from(uniqueSuggestions.values()).slice(0, 8)
}

/**
 * Busca opcional para agilizar a digitação na roleta.
 *
 * A entrada manual nunca depende deste serviço: falhas de rede, respostas
 * inválidas e bloqueios do provedor simplesmente produzem uma lista vazia.
 */
export async function searchMovieSuggestions(
  term: string,
  signal?: AbortSignal,
): Promise<MovieSuggestion[]> {
  const query = term.trim()
  if (query.length < 3) return []

  const params = new URLSearchParams({
    term: query,
    // A busca específica de filmes tem retornado vazia. A busca geral ainda
    // contém filmes e é filtrada localmente por `kind: feature-movie`.
    media: 'all',
    // O catálogo BR deixou de retornar filmes; o catálogo US ainda oferece
    // resultados e serve apenas como sugestão, sem limitar a entrada manual.
    country: 'US',
    limit: '50',
  })

  return new Promise((resolve) => {
    if (signal?.aborted || typeof document === 'undefined') {
      resolve([])
      return
    }

    const callbackName = `__triviaItunesSearch_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const jsonpGlobal = globalThis as ItunesJsonpGlobal
    let settled = false

    const finish = (suggestions: MovieSuggestion[]) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', handleAbort)
      script.remove()
      delete jsonpGlobal[callbackName]
      resolve(suggestions)
    }

    const handleAbort = () => finish([])
    const timeout = window.setTimeout(() => finish([]), 4_000)

    jsonpGlobal[callbackName] = (payload: ItunesSearchResponse) => {
      finish(normalizeMovieSuggestions(payload))
    }
    script.async = true
    script.onerror = () => finish([])
    params.set('callback', callbackName)
    script.src = `${ITUNES_SEARCH_ENDPOINT}?${params.toString()}`
    signal?.addEventListener('abort', handleAbort, { once: true })
    document.head.appendChild(script)
  })
}
