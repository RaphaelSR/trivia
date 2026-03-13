import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../shared/constants/storage'
import { storageService } from '../shared/services/storage.service'
import {
  createCustomFilm,
  type CustomFilm,
  type StreamingPlatform,
  type FilmGenre,
} from '../data/customFilms'

export function useCustomFilms() {
  const [films, setFilms] = useState<CustomFilm[]>([])

  useEffect(() => {
    setFilms(storageService.getJson<CustomFilm[]>(STORAGE_KEYS.customFilms, []))
  }, [])

  const saveFilms = (newFilms: CustomFilm[]) => {
    setFilms(newFilms)
    storageService.setJson(STORAGE_KEYS.customFilms, newFilms)
  }

  const addFilm = (filmData: {
    name: string
    year?: number
    genre?: FilmGenre
    streaming?: StreamingPlatform
    link?: string
    notes?: string
    addedBy?: string
  }) => {
    const newFilm = createCustomFilm(filmData)
    const updatedFilms = [newFilm, ...films]
    saveFilms(updatedFilms)
    return newFilm
  }

  const updateFilm = (
    id: string,
    updates: Partial<Omit<CustomFilm, 'id' | 'addedAt'>>,
  ) => {
    const updatedFilms = films.map((film) => (film.id === id ? { ...film, ...updates } : film))
    saveFilms(updatedFilms)
  }

  const removeFilm = (id: string) => {
    const updatedFilms = films.filter((film) => film.id !== id)
    saveFilms(updatedFilms)
  }

  const getFilmsByGenre = (genre: FilmGenre) => {
    return films.filter((film) => film.genre === genre)
  }

  const getFilmsByStreaming = (streaming: StreamingPlatform) => {
    return films.filter((film) => film.streaming === streaming)
  }

  const searchFilms = (query: string) => {
    const lowercaseQuery = query.toLowerCase()
    return films.filter(
      (film) =>
        film.name.toLowerCase().includes(lowercaseQuery) ||
        film.notes?.toLowerCase().includes(lowercaseQuery),
    )
  }

  return {
    films,
    addFilm,
    updateFilm,
    removeFilm,
    getFilmsByGenre,
    getFilmsByStreaming,
    searchFilms,
  }
}
