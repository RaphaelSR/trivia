import type { CustomFilm } from '../../../data/customFilms'

export type RouletteResult = {
  participantId: string
  participantName: string
  teamName: string
  film: CustomFilm
}

/**
 * Embaralha array de filmes aleatoriamente
 */
function shuffleFilms<T>(films: T[]): T[] {
  const shuffled = [...films]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Verifica se um título de filme já foi sorteado
 */
function isTitleAlreadyDrawn(title: string, drawnTitles: Set<string>): boolean {
  return drawnTitles.has(title.toLowerCase().trim())
}

/**
 * Verifica se um filme deve ser descartado baseado nas regras
 */
function shouldDiscardFilm(
  film: CustomFilm,
  drawnTitles: Set<string>,
  personsWithFilms: Set<string>,
  allowMultiplePerPerson: boolean
): boolean {
  const filmTitle = film.name.toLowerCase().trim()
  const personName = film.addedBy?.toLowerCase().trim() || ''

  if (isTitleAlreadyDrawn(filmTitle, drawnTitles)) {
    return true
  }

  if (!allowMultiplePerPerson && personName && personsWithFilms.has(personName)) {
    return true
  }

  return false
}

/**
 * Sorteia filmes únicos para o próximo trivia
 * 
 * @param films - Lista de filmes indicados
 * @param participants - Mapa de participantes (id -> {name, teamName})
 * @param maxFilms - Máximo de filmes únicos a sortear
 * @param allowMultiplePerPerson - Se true, permite múltiplos filmes por pessoa
 * @returns Array de resultados com filmes únicos (sem repetir títulos)
 * 
 * Regras:
 * 1. Nunca repete títulos (mesmo filme indicado por pessoas diferentes)
 * 2. Respeita máximo de filmes sorteados
 * 3. Se allowMultiplePerPerson=false, descarta outros filmes da pessoa após 1 sorteado
 */
export function drawUniqueFilms(
  films: CustomFilm[],
  participants: Map<string, { name: string; teamName: string }>,
  maxFilms: number,
  allowMultiplePerPerson: boolean = false
): RouletteResult[] {
  if (films.length === 0 || maxFilms <= 0) {
    return []
  }

  const shuffledFilms = shuffleFilms(films)
  const results: RouletteResult[] = []
  const drawnTitles = new Set<string>()
  const personsWithFilms = new Set<string>()

  for (const film of shuffledFilms) {
    if (results.length >= maxFilms) {
      break
    }

    if (shouldDiscardFilm(film, drawnTitles, personsWithFilms, allowMultiplePerPerson)) {
      continue
    }

    const personName = film.addedBy?.toLowerCase().trim() || ''
    const participantId = Array.from(participants.entries()).find(
      ([_, p]) => p.name.toLowerCase().trim() === personName
    )?.[0] || ''

    const participant = participants.get(participantId) || {
      name: film.addedBy || 'Desconhecido',
      teamName: 'Sem time'
    }

    results.push({
      participantId,
      participantName: participant.name,
      teamName: participant.teamName,
      film
    })

    drawnTitles.add(film.name.toLowerCase().trim())
    
    if (personName) {
      personsWithFilms.add(personName)
    }
  }

  return results
}

