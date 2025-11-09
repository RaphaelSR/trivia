import type { TriviaColumn, TriviaQuestionTile } from '@/modules/trivia/types'

export type FilmExportData = {
  version: string
  exportedAt: string
  films: Array<{
    name: string
    year?: number
    genre?: string
    streaming?: string
    link?: string
    notes?: string
    addedBy?: string
    questions: Array<{
      points: number
      question: string
      answer: string
    }>
  }>
}

export type FilmImportResult = {
  success: boolean
  films: FilmExportData['films']
  errors: string[]
  warnings: string[]
}

/**
 * Exporta filmes com perguntas para formato JSON
 */
export function exportFilmsWithQuestions(board: TriviaColumn[]): FilmExportData {
  const films = board.map((column) => {
    const questions = column.tiles.map((tile) => ({
      points: tile.points,
      question: tile.question,
      answer: tile.answer,
    }))

    return {
      name: column.film,
      questions,
    }
  })

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    films,
  }
}

/**
 * Valida estrutura de dados de importação
 */
function validateImportData(data: unknown): data is FilmExportData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.version !== 'string' || !Array.isArray(obj.films)) {
    return false
  }

  return obj.films.every((film) => {
    if (!film || typeof film !== 'object') return false
    const filmObj = film as Record<string, unknown>
    return (
      typeof filmObj.name === 'string' &&
      Array.isArray(filmObj.questions) &&
      filmObj.questions.every((q) => {
        if (!q || typeof q !== 'object') return false
        const qObj = q as Record<string, unknown>
        return (
          typeof qObj.points === 'number' &&
          typeof qObj.question === 'string' &&
          typeof qObj.answer === 'string'
        )
      })
    )
  })
}

/**
 * Importa filmes com perguntas de formato JSON
 */
export function importFilmsWithQuestions(
  data: unknown,
  existingFilms: TriviaColumn[]
): FilmImportResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!validateImportData(data)) {
    return {
      success: false,
      films: [],
      errors: ['Formato JSON inválido. Estrutura esperada não encontrada.'],
      warnings: [],
    }
  }

  const importData = data as FilmExportData
  const films: FilmExportData['films'] = []

  for (const film of importData.films) {
    if (!film.name || film.name.trim() === '') {
      errors.push('Filme sem nome encontrado')
      continue
    }

    if (!Array.isArray(film.questions) || film.questions.length === 0) {
      warnings.push(`Filme "${film.name}" não possui perguntas`)
    }

    const existingFilm = existingFilms.find(
      (col) => col.film.toLowerCase().trim() === film.name.toLowerCase().trim()
    )

    if (existingFilm) {
      warnings.push(`Filme "${film.name}" já existe no board. Será adicionado como novo filme.`)
    }

    films.push({
      name: film.name.trim(),
      year: film.year,
      genre: film.genre,
      streaming: film.streaming,
      link: film.link,
      notes: film.notes,
      addedBy: film.addedBy,
      questions: film.questions.filter((q) => {
        if (!q.question || q.question.trim() === '') {
          warnings.push(`Pergunta sem texto encontrada no filme "${film.name}"`)
          return false
        }
        if (q.points <= 0) {
          warnings.push(`Pergunta com pontos inválidos (${q.points}) no filme "${film.name}"`)
          return false
        }
        return true
      }),
    })
  }

  return {
    success: films.length > 0 && errors.length === 0,
    films,
    errors,
    warnings,
  }
}

/**
 * Converte dados de importação para formato de colunas
 */
export function convertImportToColumns(
  importData: FilmImportResult,
  createColumnId: () => string,
  _createTileId: (columnId: string, points: number) => string
): Array<{
  column: Omit<TriviaColumn, 'id' | 'tiles'>
  tiles: Array<Omit<TriviaQuestionTile, 'id'>>
}> {
  return importData.films.map((film) => {
    createColumnId()

    const tiles = film.questions.map((q) => ({
      film: film.name,
      points: q.points,
      question: q.question,
      answer: q.answer,
      state: 'available' as const,
    }))

    return {
      column: {
        film: film.name,
        filmId: '',
        tiles: [],
      },
      tiles,
    }
  })
}

/**
 * Faz download de arquivo JSON
 */
export function downloadJsonFile(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

