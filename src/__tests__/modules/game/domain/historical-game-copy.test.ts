import { createFinishedGameCopy } from '@/modules/game/domain/historical-game-copy'
import type { TriviaSession } from '@/modules/trivia/types'

const SOURCE: TriviaSession = {
  id: 'original-session',
  title: 'Noite original',
  scheduledAt: '2026-05-23T20:00:00.000Z',
  theme: {
    id: 'dark',
    name: 'Escuro',
    palette: {
      background: '#000',
      primary: '#fff',
      secondary: '#ccc',
      accent: '#aaa',
      surface: '#111',
    },
  },
  teams: [
    { id: 'a', name: 'A', color: '#f00', order: 0, members: ['a1'], score: 300 },
    { id: 'b', name: 'B', color: '#0f0', order: 1, members: ['b1'], score: 200 },
    { id: 'c', name: 'C', color: '#00f', order: 2, members: ['c1'], score: 100 },
  ],
  participants: [
    { id: 'a1', name: 'A1', role: 'player', teamId: 'a' },
    { id: 'b1', name: 'B1', role: 'player', teamId: 'b' },
    { id: 'c1', name: 'C1', role: 'player', teamId: 'c' },
  ],
  board: [{
    id: 'film-1',
    filmId: 'film-1',
    film: 'Filme',
    tiles: [{
      id: 'q1',
      film: 'Filme',
      points: 100,
      state: 'answered',
      question: 'Pergunta',
      answer: 'Resposta',
      answeredBy: {
        participantId: 'a1',
        teamId: 'a',
        pointsAwarded: 100,
        timestamp: '2026-05-23T21:00:00.000Z',
      },
    }],
  }],
  activeTeamId: 'a',
  activeParticipantId: 'a1',
  activeTurnIndex: 0,
  turnSequence: ['a1'],
  mimicaScores: [{
    id: 'm1',
    participantId: 'b1',
    teamId: 'b',
    pointsAwarded: 50,
    timestamp: '2026-05-23T22:00:00.000Z',
    turnNumber: 1,
    roundNumber: 1,
    mode: 'full-current',
  }],
  eventLog: [{
    id: 'e1',
    type: 'trivia-award',
    timestamp: '2026-05-23T21:00:00.000Z',
    source: 'trivia',
    tileId: 'q1',
    pointsAwarded: 100,
    participantId: 'a1',
    teamId: 'a',
  }],
}

it('continua em uma copia independente sem alterar o resultado arquivado', () => {
  const copy = createFinishedGameCopy(SOURCE, 'continue', {
    id: 'copy-session',
    title: 'Noite original — cópia',
    nowIso: '2026-07-16T12:00:00.000Z',
  })

  expect(copy).toMatchObject({
    id: 'copy-session',
    title: 'Noite original — cópia',
    scheduledAt: '2026-07-16T12:00:00.000Z',
    teams: [{ score: 300 }, { score: 200 }, { score: 100 }],
  })
  expect(copy.board[0].tiles[0].state).toBe('answered')
  expect(copy.board[0].tiles[0].answeredBy?.participantId).toBe('a1')
  expect(copy.mimicaScores).toHaveLength(1)
  expect(copy.eventLog).toHaveLength(1)

  copy.teams[0].score = 999
  copy.board[0].tiles[0].question = 'Editada'
  expect(SOURCE.teams[0].score).toBe(300)
  expect(SOURCE.board[0].tiles[0].question).toBe('Pergunta')
})

it('recomeca com a mesma estrutura e zera somente o progresso', () => {
  const copy = createFinishedGameCopy(SOURCE, 'restart', {
    id: 'restart-session',
    title: 'Nova rodada',
    nowIso: '2026-07-16T12:00:00.000Z',
  })

  expect(copy.teams.map((team) => team.score)).toEqual([0, 0, 0])
  expect(copy.participants).toEqual(SOURCE.participants)
  expect(copy.board[0]).toMatchObject({ film: 'Filme' })
  expect(copy.board[0].tiles[0]).toMatchObject({
    id: 'q1',
    question: 'Pergunta',
    answer: 'Resposta',
    state: 'available',
  })
  expect(copy.board[0].tiles[0].answeredBy).toBeUndefined()
  expect(copy.mimicaScores).toEqual([])
  expect(copy.eventLog).toEqual([])
  expect(copy.turnSequence).toHaveLength(1)
  expect(copy.activeParticipantId).toBe('a1')
})
