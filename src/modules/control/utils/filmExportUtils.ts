import type { TriviaColumn, TriviaQuestionTile } from '@/modules/trivia/types'
import { i18n } from '@/shared/i18n'

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
      errors: [i18n.t('game:library.importIssues.invalidFormat')],
      warnings: [],
    }
  }

  const importData = data as FilmExportData
  const films: FilmExportData['films'] = []

  for (const film of importData.films) {
    if (!film.name || film.name.trim() === '') {
      errors.push(i18n.t('game:library.importIssues.unnamedFilm'))
      continue
    }

    if (!Array.isArray(film.questions) || film.questions.length === 0) {
      warnings.push(i18n.t('game:library.importIssues.filmWithoutQuestions', { film: film.name }))
    }

    const existingFilm = existingFilms.find(
      (col) => col.film.toLowerCase().trim() === film.name.toLowerCase().trim()
    )

    if (existingFilm) {
      warnings.push(i18n.t('game:library.importIssues.existingFilm', { film: film.name }))
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
          warnings.push(i18n.t('game:library.importIssues.questionWithoutText', { film: film.name }))
          return false
        }
        if (q.points <= 0) {
          warnings.push(i18n.t('game:library.importIssues.invalidPoints', {
            film: film.name,
            points: q.points,
          }))
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


export type ImportPlan = {
  /** Filmes que já existem no board (match por nome) — atualizar as perguntas. */
  updates: Array<{ columnId: string; film: string; tiles: Array<Omit<TriviaQuestionTile, 'id'>> }>
  /** Filmes novos — adicionar. */
  additions: Array<{ film: string; tiles: Array<Omit<TriviaQuestionTile, 'id'>> }>
}

/**
 * Decide o destino de cada filme importado: atualizar um existente (mesmo
 * nome, ignorando caixa/espaços) ou adicionar como novo. Sem isso, re-importar
 * o arquivo editado DUPLICAVA todos os filmes.
 */
export function planImport(
  board: TriviaColumn[],
  importData: Array<{ column: { film: string }; tiles: Array<Omit<TriviaQuestionTile, 'id'>> }>,
): ImportPlan {
  const byName = new Map(board.map((column) => [column.film.trim().toLowerCase(), column.id]))
  const plan: ImportPlan = { updates: [], additions: [] }
  for (const { column, tiles } of importData) {
    const existingId = byName.get(column.film.trim().toLowerCase())
    if (existingId) {
      plan.updates.push({ columnId: existingId, film: column.film, tiles })
    } else {
      plan.additions.push({ film: column.film, tiles })
    }
  }
  return plan
}
