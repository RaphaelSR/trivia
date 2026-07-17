import { useEffect, useState, type FormEvent } from 'react'
import { Film, Plus, Search, Trash2 } from 'lucide-react'
import type { TriviaParticipant } from '../../modules/trivia/types'
import { searchMovieSuggestions, type MovieSuggestion } from '../../shared/services/movie-search.service'
import { Button } from './Button'
import { useTranslation } from '@/shared/i18n'

export type RouletteFilm = {
  id: string
  name: string
  year?: number
  addedBy?: string
  selected: boolean
}

type RouletteFilmPickerProps = {
  films: RouletteFilm[]
  participants: TriviaParticipant[]
  onFilmsChange: (films: RouletteFilm[]) => void
}

function createRouletteFilm(name: string, year: number | undefined, addedBy: string | undefined): RouletteFilm {
  return {
    id: `roulette-film-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    year,
    addedBy,
    selected: true,
  }
}

export function RouletteFilmPicker({ films, participants, onFilmsChange }: RouletteFilmPickerProps) {
  const { t } = useTranslation('game')
  const players = participants.filter((participant) => participant.role === 'player')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState<number | undefined>()
  const [participantId, setParticipantId] = useState(players[0]?.id ?? '')
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([])

  useEffect(() => {
    if (!players.some((participant) => participant.id === participantId)) {
      setParticipantId(players[0]?.id ?? '')
    }
  }, [participantId, players])

  useEffect(() => {
    const query = title.trim()
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    let isCurrent = true
    const timer = window.setTimeout(async () => {
      const matches = await searchMovieSuggestions(query, controller.signal)
      if (isCurrent) setSuggestions(matches)
    }, 600)

    return () => {
      isCurrent = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [title])

  const addFilm = (event: FormEvent) => {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle) return

    const participant = players.find((player) => player.id === participantId)
    onFilmsChange([...films, createRouletteFilm(normalizedTitle, year, participant?.name)])
    setTitle('')
    setYear(undefined)
    setSuggestions([])
  }

  const applySuggestion = (suggestion: MovieSuggestion) => {
    setTitle(suggestion.title)
    setYear(suggestion.year)
    setSuggestions([])
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">{t('roulettePicker.eyebrow')}</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--color-text)]">{t('roulettePicker.title')}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
          {t('roulettePicker.description')}
        </p>
      </div>

      <form onSubmit={addFilm} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_minmax(10rem,0.65fr)_auto] md:items-end">
          <div className="relative space-y-1.5">
            <label htmlFor="roulette-film-title" className="text-xs font-semibold text-[var(--color-text)]">
              {t('roulettePicker.film')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                id="roulette-film-title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  setYear(undefined)
                }}
                autoComplete="off"
                placeholder={t('roulettePicker.titlePlaceholder')}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xl">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-primary)]/10"
                  >
                    <span className="truncate">{suggestion.title}</span>
                    {suggestion.year && <span className="ml-3 shrink-0 text-xs text-[var(--color-muted)]">{suggestion.year}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="roulette-film-year" className="text-xs font-semibold text-[var(--color-text)]">{t('roulettePicker.year')}</label>
            <input
              id="roulette-film-year"
              type="number"
              min="1888"
              max={new Date().getFullYear() + 2}
              value={year ?? ''}
              onChange={(event) => setYear(event.target.value ? Number(event.target.value) : undefined)}
              placeholder={t('roulettePicker.optional')}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="roulette-film-participant" className="text-xs font-semibold text-[var(--color-text)]">{t('roulettePicker.indicatedBy')}</label>
            <select
              id="roulette-film-participant"
              value={participantId}
              onChange={(event) => setParticipantId(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            >
              {players.length === 0 && <option value="">{t('roulettePicker.noParticipant')}</option>}
              {players.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}
            </select>
          </div>

          <Button type="submit" variant="outline" disabled={!title.trim()} className="gap-2 md:h-[42px]">
            <Plus size={16} /> {t('roulettePicker.add')}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {t('roulettePicker.suggestionsHint')}
        </p>
      </form>

      {films.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-10 text-center">
          <Film className="mx-auto h-7 w-7 text-[var(--color-muted)]" />
          <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{t('roulettePicker.emptyTitle')}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{t('roulettePicker.emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {films.map((film) => (
            <div key={film.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Film size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]">{film.name}</p>
                <p className="truncate text-[11px] text-[var(--color-muted)]">
                  {[film.year, film.addedBy].filter(Boolean).join(' · ') || t('roulettePicker.noDetails')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFilmsChange(films.filter((candidate) => candidate.id !== film.id))}
                className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                aria-label={t('roulettePicker.removeFilm', { name: film.name })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
