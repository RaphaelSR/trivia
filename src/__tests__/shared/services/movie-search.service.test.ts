import { searchMovieSuggestions } from '../../../shared/services/movie-search.service'

describe('movie-search.service', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[src*="itunes.apple.com/search"]').forEach((script) => script.remove())
    jest.restoreAllMocks()
  })

  it('não chama o provedor antes de três caracteres', async () => {
    await expect(searchMovieSuggestions('Up')).resolves.toEqual([])
    expect(document.head.querySelector('script[src*="itunes.apple.com/search"]')).toBeNull()
  })

  it('busca somente filmes no catálogo disponível e normaliza as sugestões', async () => {
    const resultPromise = searchMovieSuggestions('matrix')
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="itunes.apple.com/search"]')
    expect(script).not.toBeNull()

    const requestedUrl = new URL(script!.src)
    const callbackName = requestedUrl.searchParams.get('callback')!
    const callback = (globalThis as unknown as Record<string, (payload: unknown) => void>)[callbackName]
    callback({
      results: [
        { kind: 'feature-movie', trackId: 1, trackName: 'The Matrix', releaseDate: '1999-03-30T08:00:00Z' },
        { kind: 'feature-movie', trackId: 2, trackName: 'The Matrix', releaseDate: '1999-03-30T08:00:00Z' },
        { kind: 'song', trackId: 99, trackName: 'Matrix Song', releaseDate: '2020-01-01T00:00:00Z' },
        { kind: 'feature-movie', trackId: 3, trackName: 'Matrix: Resurrections', releaseDate: '2021-12-22T08:00:00Z' },
      ],
    })

    await expect(resultPromise).resolves.toEqual([
      { id: '1', title: 'The Matrix', year: 1999 },
      { id: '3', title: 'Matrix: Resurrections', year: 2021 },
    ])

    expect(requestedUrl.searchParams.get('term')).toBe('matrix')
    expect(requestedUrl.searchParams.get('media')).toBe('all')
    expect(requestedUrl.searchParams.get('country')).toBe('US')
  })

  it('ignora silenciosamente falhas do provedor', async () => {
    const resultPromise = searchMovieSuggestions('qualquer filme')
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="itunes.apple.com/search"]')
    script?.dispatchEvent(new Event('error'))

    await expect(resultPromise).resolves.toEqual([])
  })
})
