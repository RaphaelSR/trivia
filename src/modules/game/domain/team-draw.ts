import type { TriviaSession } from '../../trivia/types'

export type RandomSource = () => number

/**
 * O sorteio de times só pode substituir a formação antes de qualquer ação de jogo.
 * Manter esta regra no domínio impede que uma conveniência de setup reescreva
 * pontuação, perguntas reveladas ou a ordem já percorrida.
 */
export function canDrawTeamsBeforePlay(session: TriviaSession): boolean {
  const hasTouchedTile = session.board.some((column) =>
    column.tiles.some((tile) => tile.state !== 'available'),
  )
  const hasScore = session.teams.some((team) => (team.score ?? 0) !== 0)

  return !hasTouchedTile &&
    !hasScore &&
    (session.eventLog?.length ?? 0) === 0 &&
    (session.mimicaScores?.length ?? 0) === 0
}

/**
 * Embaralha e distribui itens em grupos equilibrados. A diferença de tamanho
 * entre quaisquer grupos é sempre no máximo 1.
 */
export function drawBalancedGroups<T>(
  items: T[],
  groupCount: number,
  random: RandomSource = Math.random,
): T[][] {
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > items.length) {
    return []
  }

  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(normalizeRandom(random()) * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }

  const groups = Array.from({ length: groupCount }, () => [] as T[])
  const startIndex = Math.floor(normalizeRandom(random()) * groupCount)

  shuffled.forEach((item, index) => {
    groups[(startIndex + index) % groupCount].push(item)
  })

  return groups
}

function normalizeRandom(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 0.9999999999999999)
}
