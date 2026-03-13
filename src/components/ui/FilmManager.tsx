import { useMemo, useState } from 'react'
import { Edit, Film, Grid2X2, List, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Button } from './Button'
import { FilmForm } from './FilmForm'
import { filmGenres, getStreamingPlatformInfo, getFilmGenreInfo, streamingPlatforms, type CustomFilm, type StreamingPlatform, type FilmGenre } from '../../data/customFilms'
import type { TriviaParticipant } from '../../modules/trivia/types'

type FilmManagerProps = {
  films: CustomFilm[]
  participants?: TriviaParticipant[]
  sessionFilms?: Array<{ id: string; name: string }>
  viewMode?: ViewMode
  onViewModeChange?: (value: ViewMode) => void
  sortMode?: SortMode
  onSortModeChange?: (value: SortMode) => void
  onAddFilm: (filmData: {
    name: string
    year?: number
    genre?: FilmGenre
    streaming?: StreamingPlatform
    link?: string
    notes?: string
    addedBy?: string
  }) => void
  onUpdateFilm: (id: string, updates: Partial<Omit<CustomFilm, 'id' | 'addedAt'>>) => void
  onRemoveFilm: (id: string) => void
  onClose: () => void
}

type ViewMode = 'grid' | 'list'
type SortMode = 'recent' | 'az' | 'year'

function sortFilms(films: CustomFilm[], sortMode: SortMode) {
  const ordered = [...films]
  switch (sortMode) {
    case 'az':
      return ordered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'year':
      return ordered.sort((a, b) => (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name, 'pt-BR'))
    case 'recent':
    default:
      return ordered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  }
}

export function FilmManager({
  films,
  participants = [],
  sessionFilms = [],
  viewMode: controlledViewMode,
  onViewModeChange,
  sortMode: controlledSortMode,
  onSortModeChange,
  onAddFilm,
  onUpdateFilm,
  onRemoveFilm,
  onClose,
}: FilmManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingFilm, setEditingFilm] = useState<CustomFilm | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedStreaming, setSelectedStreaming] = useState<string>('')
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('grid')
  const [internalSortMode, setInternalSortMode] = useState<SortMode>('recent')

  const viewMode = controlledViewMode ?? internalViewMode
  const sortMode = controlledSortMode ?? internalSortMode

  const updateViewMode = (value: ViewMode) => {
    onViewModeChange?.(value)
    setInternalViewMode(value)
  }

  const updateSortMode = (value: SortMode) => {
    onSortModeChange?.(value)
    setInternalSortMode(value)
  }

  const filteredFilms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = films.filter((film) => {
      const matchesSearch =
        !query ||
        film.name.toLowerCase().includes(query) ||
        film.notes?.toLowerCase().includes(query) ||
        film.addedBy?.toLowerCase().includes(query)

      const matchesGenre = !selectedGenre || film.genre === selectedGenre
      const matchesStreaming = !selectedStreaming || film.streaming === selectedStreaming

      return matchesSearch && matchesGenre && matchesStreaming
    })

    return sortFilms(base, sortMode)
  }, [films, searchQuery, selectedGenre, selectedStreaming, sortMode])

  const sessionFilmNames = new Set(sessionFilms.map((film) => film.name.toLowerCase().trim()))
  const sessionOnlyFilms = sessionFilms.filter(
    (film) => !films.some((customFilm) => customFilm.name.toLowerCase().trim() === film.name.toLowerCase().trim()),
  )

  const handleEditFilm = (film: CustomFilm) => {
    setEditingFilm(film)
    setShowForm(true)
  }

  const handleFormSubmit = (filmData: {
    name: string
    year?: number
    genre?: FilmGenre
    streaming?: StreamingPlatform
    link?: string
    notes?: string
    addedBy?: string
  }) => {
    if (editingFilm) {
      onUpdateFilm(editingFilm.id, filmData)
    } else {
      onAddFilm(filmData)
    }
    setShowForm(false)
    setEditingFilm(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingFilm(null)
  }

  const handleRemoveFilm = (film: CustomFilm) => {
    if (window.confirm(`Remover o filme "${film.name}"?`)) {
      onRemoveFilm(film.id)
    }
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Catálogo</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              {editingFilm ? 'Editar filme' : 'Adicionar novo filme'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={handleFormCancel}>
            <X size={18} />
          </Button>
        </div>
        <FilmForm
          film={editingFilm || undefined}
          participants={participants}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">Filmes</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Catálogo da sessão</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            Organize filmes para o sorteio e mantenha separado o que já está no board atual do que foi salvo no catálogo personalizado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} />
            Adicionar filme
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="toolbar-sticky space-y-4 rounded-[28px] border border-white/10 bg-black/10 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              placeholder="Buscar por título, nota ou responsável..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-[var(--color-text)] outline-none ring-0 placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => updateViewMode('grid')}>
              <Grid2X2 size={16} />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => updateViewMode('list')}>
              <List size={16} />
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--color-muted)]">
              <SlidersHorizontal size={14} />
              <span>Ordenar</span>
              <select
                value={sortMode}
                onChange={(event) => updateSortMode(event.target.value as SortMode)}
                className="bg-transparent text-sm text-[var(--color-text)] outline-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="az">A-Z</option>
                <option value="year">Ano</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedGenre('')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!selectedGenre ? 'bg-[var(--color-primary)] text-white' : 'border border-white/10 bg-white/[0.03] text-[var(--color-muted)]'}`}
          >
            Todos os gêneros
          </button>
          {filmGenres.slice(0, 8).map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => setSelectedGenre((current) => (current === genre.id ? '' : genre.id))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedGenre === genre.id ? 'bg-[var(--color-primary)] text-white' : 'border border-white/10 bg-white/[0.03] text-[var(--color-muted)]'}`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedStreaming('')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!selectedStreaming ? 'bg-[var(--color-secondary)] text-black' : 'border border-white/10 bg-white/[0.03] text-[var(--color-muted)]'}`}
          >
            Todas as plataformas
          </button>
          {streamingPlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => setSelectedStreaming((current) => (current === platform.id ? '' : platform.id))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selectedStreaming === platform.id ? 'text-white' : 'border border-white/10 bg-white/[0.03] text-[var(--color-muted)]'}`}
              style={selectedStreaming === platform.id ? { backgroundColor: platform.color } : undefined}
            >
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Sessão atual</p>
            <h4 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Filmes já no board</h4>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
            {sessionFilms.length} itens
          </span>
        </div>
        {sessionFilms.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            Nenhum filme presente no board da sessão atual.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sessionFilms.map((film) => (
              <div key={film.id} className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[var(--color-primary)]">
                    <Film size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{film.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {sessionFilmNames.has(film.name.toLowerCase().trim()) ? 'Sincronizado com o catálogo' : 'Apenas no board atual'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Catálogo salvo</p>
            <h4 className="mt-2 text-lg font-semibold text-[var(--color-text)]">Filmes personalizados</h4>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
            {filteredFilms.length} resultados
          </span>
        </div>

        {filteredFilms.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              {films.length === 0 ? 'Nenhum filme personalizado adicionado ainda.' : 'Nenhum filme encontrado com os filtros atuais.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="catalog-grid grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredFilms.map((film) => {
              const streamingInfo = film.streaming ? getStreamingPlatformInfo(film.streaming) : null
              const genreInfo = film.genre ? getFilmGenreInfo(film.genre) : null
              const isInSession = sessionFilmNames.has(film.name.toLowerCase().trim())

              return (
                <article key={film.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-[var(--color-primary)]/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[var(--color-primary)]">
                      <Film size={18} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditFilm(film)} title="Editar filme">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveFilm(film)} title="Remover filme">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <h5 className="text-base font-semibold text-[var(--color-text)]">{film.name}</h5>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {film.addedBy ? `Adicionado por ${film.addedBy}` : 'Sem responsável definido'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {film.year ? <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-[var(--color-muted)]">{film.year}</span> : null}
                      {genreInfo ? <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">{genreInfo.name}</span> : null}
                      {streamingInfo ? <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: streamingInfo.color }}>{streamingInfo.name}</span> : null}
                      {isInSession ? <span className="rounded-full bg-[var(--color-secondary)]/90 px-2.5 py-1 text-xs font-semibold text-black">No board</span> : null}
                    </div>

                    {film.notes ? <p className="line-clamp-3 text-sm leading-6 text-[var(--color-muted)]">{film.notes}</p> : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFilms.map((film) => {
              const streamingInfo = film.streaming ? getStreamingPlatformInfo(film.streaming) : null
              const genreInfo = film.genre ? getFilmGenreInfo(film.genre) : null
              const isInSession = sessionFilmNames.has(film.name.toLowerCase().trim())

              return (
                <div key={film.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-sm font-semibold text-[var(--color-text)]">{film.name}</h5>
                        {film.year ? <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-[var(--color-muted)]">{film.year}</span> : null}
                        {genreInfo ? <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]">{genreInfo.name}</span> : null}
                        {streamingInfo ? <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: streamingInfo.color }}>{streamingInfo.name}</span> : null}
                        {isInSession ? <span className="rounded-full bg-[var(--color-secondary)]/90 px-2.5 py-1 text-xs font-semibold text-black">No board</span> : null}
                      </div>
                      {film.notes ? <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{film.notes}</p> : null}
                      <p className="mt-2 text-xs text-[var(--color-muted)]">{film.addedBy ? `Adicionado por ${film.addedBy}` : 'Sem responsável definido'} · {new Date(film.addedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditFilm(film)} title="Editar filme">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveFilm(film)} title="Remover filme">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {sessionOnlyFilms.length > 0 ? (
          <div className="rounded-[24px] border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/8 p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">Filmes presentes apenas no board</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Esses filmes foram criados no fluxo da sessão e ainda não existem no catálogo persistido.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sessionOnlyFilms.map((film) => (
                <span key={film.id} className="rounded-full border border-[var(--color-secondary)]/20 bg-black/20 px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
                  {film.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
