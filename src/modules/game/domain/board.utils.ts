import type { TriviaColumn, TriviaQuestionTile } from '../../trivia/types'

export function countTotalTiles(board: TriviaColumn[]): number {
  return board.reduce((acc, column) => acc + column.tiles.length, 0)
}

export function countAnsweredTiles(board: TriviaColumn[]): number {
  return board.reduce(
    (acc, column) => acc + column.tiles.filter((tile) => tile.state === 'answered').length,
    0,
  )
}

export function getAvailableTiles(board: TriviaColumn[]): TriviaQuestionTile[] {
  return board.flatMap((column) => column.tiles.filter((tile) => tile.state === 'available'))
}

export function isGameFinished(board: TriviaColumn[]): boolean {
  const totalTiles = countTotalTiles(board)
  return totalTiles > 0 && countAnsweredTiles(board) === totalTiles
}

/**
 * Garante que todo tile do board tenha um id único.
 *
 * Bug histórico: o import em massa de perguntas criava vários tiles no mesmo
 * milissegundo, gerando ids `${columnId}-tile-${Date.now()}` IDÊNTICOS. Como
 * `updateTileState` casa por `tile.id`, responder/abrir uma carta mudava o
 * estado de TODAS as cartas que compartilhavam o id — travando o filme inteiro.
 *
 * Esta função CURA sessões já corrompidas: mantém o id da PRIMEIRA ocorrência
 * (preservando qualquer referência em andamento) e reescreve apenas as
 * duplicatas seguintes com um id determinístico e único. Não toca em nenhum
 * outro campo (pergunta, resposta, estado). É no-op (retorna a mesma
 * referência) quando não há duplicatas, então não perturba sessões saudáveis
 * nem dispara re-renders desnecessários.
 */
/**
 * Solta cartas presas em 'active' de volta para 'available'.
 *
 * 'active' significa "o modal desta pergunta está aberto AGORA" — é um estado
 * de UI transitório. Qualquer sessão que volta do armazenamento (F5, restaurar
 * checkpoint/snapshot, sync da nuvem) não tem modal aberto; sem esta cura, a
 * carta fica presa como "AO VIVO" para sempre e a pergunta se perde.
 * Retorna a MESMA referência quando nada muda.
 */
export function releaseActiveTiles<T extends { board: TriviaColumn[] }>(session: T): T {
  let changed = false

  const board = session.board.map((column) => {
    if (!column.tiles.some((tile) => tile.state === 'active')) return column
    changed = true
    return {
      ...column,
      tiles: column.tiles.map((tile) =>
        tile.state === 'active' ? { ...tile, state: 'available' as const } : tile,
      ),
    }
  })

  return changed ? { ...session, board } : session
}

export function dedupeTileIds<T extends { board: TriviaColumn[] }>(session: T): T {
  const seen = new Set<string>()
  let changed = false

  const board = session.board.map((column) => {
    let columnChanged = false
    const tiles = column.tiles.map((tile, index) => {
      if (!seen.has(tile.id)) {
        seen.add(tile.id)
        return tile
      }
      columnChanged = true
      changed = true
      let candidate = `${column.id}-tile-${tile.points}-${index}`
      while (seen.has(candidate)) {
        candidate = `${candidate}-x`
      }
      seen.add(candidate)
      return { ...tile, id: candidate }
    })
    return columnChanged ? { ...column, tiles } : column
  })

  return changed ? { ...session, board } : session
}
