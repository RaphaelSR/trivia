import { useState } from 'react'
import { Edit, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from './Button'
import { FilmForm } from './FilmForm'
import { getStreamingPlatformInfo, getFilmGenreInfo, type CustomFilm, type StreamingPlatform, type FilmGenre } from '../../data/customFilms'
import type { TriviaParticipant } from '../../modules/trivia/types'

type FilmManagerProps = {
  films: CustomFilm[]
  participants?: TriviaParticipant[]
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

export function FilmManager({ films, participants = [], onAddFilm, onUpdateFilm, onRemoveFilm, onClose }: FilmManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingFilm, setEditingFilm] = useState<CustomFilm | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedStreaming, setSelectedStreaming] = useState<string>('')

  const filteredFilms = films.filter(film => {
    const matchesSearch = !searchQuery || 
      film.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      film.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesGenre = !selectedGenre || film.genre === selectedGenre
    const matchesStreaming = !selectedStreaming || film.streaming === selectedStreaming

    return matchesSearch && matchesGenre && matchesStreaming
  })

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {editingFilm ? 'Editar Filme' : 'Adicionar Novo Filme'}
          </h3>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            Gerenciar Filmes ({films.length})
          </h3>
          {participants.length > 0 && (
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Integrado com {participants.length} participante{participants.length !== 1 ? 's' : ''} do trivia atual
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={16} />
            Adicionar
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="Buscar filmes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-3 py-2 text-sm text-[var(--color-text)]"
              />
            </div>
          </div>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">Todos os gêneros</option>
            <option value="ação">Ação</option>
            <option value="comédia">Comédia</option>
            <option value="drama">Drama</option>
            <option value="terror">Terror</option>
            <option value="ficção-científica">Ficção Científica</option>
            <option value="outros">Outros</option>
          </select>
          <select
            value={selectedStreaming}
            onChange={(e) => setSelectedStreaming(e.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">Todas as plataformas</option>
            <option value="netflix">Netflix</option>
            <option value="prime-video">Prime Video</option>
            <option value="disney-plus">Disney+</option>
            <option value="max-hbo">Max (HBO)</option>
            <option value="youtube">YouTube</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {filteredFilms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              {films.length === 0 ? 'Nenhum filme adicionado ainda' : 'Nenhum filme encontrado'}
            </p>
          </div>
        ) : (
          filteredFilms.map((film) => {
            const streamingInfo = film.streaming ? getStreamingPlatformInfo(film.streaming) : null
            const genreInfo = film.genre ? getFilmGenreInfo(film.genre) : null

            return (
              <div
                key={film.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">
                        {film.name}
                      </h4>
                      {film.year && (
                        <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-muted)]">
                          {film.year}
                        </span>
                      )}
                      {genreInfo && (
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-xs text-[var(--color-primary)]">
                          {genreInfo.name}
                        </span>
                      )}
                      {streamingInfo && (
                        <span 
                          className="rounded-full px-2 py-1 text-xs text-white"
                          style={{ backgroundColor: streamingInfo.color }}
                        >
                          {streamingInfo.name}
                        </span>
                      )}
                    </div>
                    
                    {film.notes && (
                      <p className="text-xs text-[var(--color-muted)] mb-2">
                        {film.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                      {film.addedBy && (
                        <span className="flex items-center gap-1">
                          <span>Adicionado por:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            participants.some(p => p.name === film.addedBy)
                              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                              : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                          }`}>
                            {film.addedBy}
                            {participants.some(p => p.name === film.addedBy) && (
                              <span className="ml-1">👤</span>
                            )}
                          </span>
                        </span>
                      )}
                      <span>
                        {new Date(film.addedAt).toLocaleDateString('pt-BR')}
                      </span>
                      {film.link && (
                        <a
                          href={film.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Ver link
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditFilm(film)}
                      title="Editar filme"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFilm(film)}
                      title="Remover filme"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
