import { useState } from 'react'
import { Button } from './Button'
import { streamingPlatforms, filmGenres, type CustomFilm, type StreamingPlatform, type FilmGenre } from '../../data/customFilms'
import type { TriviaParticipant } from '../../modules/trivia/types'

type FilmFormProps = {
  film?: CustomFilm
  participants?: TriviaParticipant[]
  onSubmit: (filmData: {
    name: string
    year?: number
    genre?: FilmGenre
    streaming?: StreamingPlatform
    link?: string
    notes?: string
    addedBy?: string
  }) => void
  onCancel: () => void
}

export function FilmForm({ film, participants = [], onSubmit, onCancel }: FilmFormProps) {
  const [formData, setFormData] = useState({
    name: film?.name || '',
    year: film?.year || undefined,
    genre: film?.genre || undefined,
    streaming: film?.streaming || undefined,
    link: film?.link || '',
    notes: film?.notes || '',
    addedBy: film?.addedBy || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [useCustomName, setUseCustomName] = useState(!film?.addedBy || !participants.some(p => p.name === film?.addedBy))

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do filme é obrigatório'
    }

    if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 2)) {
      newErrors.year = 'Ano inválido'
    }

    if (formData.link && !isValidUrl(formData.link)) {
      newErrors.link = 'URL inválida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const submitData = {
      name: formData.name.trim(),
      year: formData.year || undefined,
      genre: formData.genre || undefined,
      streaming: formData.streaming || undefined,
      link: formData.link.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      addedBy: formData.addedBy.trim() || undefined
    }

    onSubmit(submitData)
  }

  const handleInputChange = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Nome do Filme *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm text-[var(--color-text)] ${
              errors.name ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
            } bg-[var(--color-background)]`}
            placeholder="Ex: O Poderoso Chefão"
          />
          {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Ano
          </label>
          <input
            type="number"
            min="1900"
            max={new Date().getFullYear() + 2}
            value={formData.year || ''}
            onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
            className={`w-full rounded-xl border px-3 py-2 text-sm text-[var(--color-text)] ${
              errors.year ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
            } bg-[var(--color-background)]`}
            placeholder="Ex: 1972"
          />
          {errors.year && <p className="text-xs text-[var(--color-danger)]">{errors.year}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Gênero
          </label>
          <select
            value={formData.genre || ''}
            onChange={(e) => handleInputChange('genre', e.target.value || undefined)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">Selecione um gênero</option>
            {filmGenres.map(genre => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Streaming
          </label>
          <select
            value={formData.streaming || ''}
            onChange={(e) => handleInputChange('streaming', e.target.value || undefined)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
          >
            <option value="">Selecione uma plataforma</option>
            {streamingPlatforms.map(platform => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Link (URL)
          </label>
          <input
            type="url"
            value={formData.link}
            onChange={(e) => handleInputChange('link', e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm text-[var(--color-text)] ${
              errors.link ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
            } bg-[var(--color-background)]`}
            placeholder="https://..."
          />
          {errors.link && <p className="text-xs text-[var(--color-danger)]">{errors.link}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Notas Adicionais
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
            rows={3}
            placeholder="Informações extras sobre o filme..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]">
            Adicionado por
          </label>
          
          {participants.length > 0 && (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUseCustomName(false)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  !useCustomName
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
                }`}
              >
                Participante
              </button>
              <button
                type="button"
                onClick={() => setUseCustomName(true)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  useCustomName
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
                }`}
              >
                Nome personalizado
              </button>
            </div>
          )}

          {!useCustomName && participants.length > 0 ? (
            <select
              value={formData.addedBy}
              onChange={(e) => handleInputChange('addedBy', e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="">Selecione um participante</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.name}>
                  {participant.name} {participant.role === 'host' ? '(Anfitrião)' : participant.role === 'assistant' ? '(Assistente)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.addedBy}
              onChange={(e) => handleInputChange('addedBy', e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
              placeholder={participants.length > 0 ? "Nome de quem sugeriu (não participante)" : "Nome de quem sugeriu"}
            />
          )}
          
          {participants.length > 0 && (
            <p className="text-xs text-[var(--color-muted)]">
              {!useCustomName 
                ? "Selecione um participante do trivia atual" 
                : "Digite o nome de quem sugeriu (para pessoas que não estão no trivia atual)"
              }
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" variant="secondary" className="flex-1">
          {film ? 'Atualizar Filme' : 'Adicionar Filme'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
