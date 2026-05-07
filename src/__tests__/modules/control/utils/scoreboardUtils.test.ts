import { buildParticipantScoreBreakdown, buildTeamScoreboard } from '@/modules/control/utils/scoreboardUtils'
import type { MimicaScore, TriviaColumn, TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'

const teams: TriviaTeam[] = [
  { id: 'team-low', name: 'Low', color: '#111', order: 0, members: ['p1'], score: 10 },
  { id: 'team-high', name: 'High', color: '#222', order: 1, members: ['p2'], score: 30 },
  { id: 'team-empty', name: 'Empty', color: '#333', order: 2, members: [], score: 0 },
]

const participants: TriviaParticipant[] = [
  { id: 'p1', name: 'Ana', role: 'player', teamId: 'team-low' },
  { id: 'p2', name: 'Bia', role: 'player', teamId: 'team-high' },
]

const board: TriviaColumn[] = [
  {
    id: 'col-1',
    filmId: 'film-1',
    film: 'Film 1',
    tiles: [
      {
        id: 'tile-1',
        film: 'Film 1',
        points: 10,
        state: 'answered',
        question: 'Q1',
        answer: 'A1',
        answeredBy: {
          participantId: 'p1',
          teamId: 'team-low',
          pointsAwarded: 7,
          timestamp: '2026-05-07T00:00:00.000Z',
        },
      },
      {
        id: 'tile-2',
        film: 'Film 1',
        points: 20,
        state: 'answered',
        question: 'Q2',
        answer: 'A2',
        answeredBy: {
          participantId: 'p2',
          teamId: 'team-high',
          pointsAwarded: 20,
          timestamp: '2026-05-07T00:00:00.000Z',
        },
      },
    ],
  },
]

const mimicaScores: MimicaScore[] = [
  {
    id: 'mimica-1',
    participantId: 'p1',
    teamId: 'team-low',
    pointsAwarded: 5,
    timestamp: '2026-05-07T00:00:00.000Z',
    turnNumber: 1,
    roundNumber: 1,
    mode: 'full-current',
  },
]

describe('scoreboardUtils', () => {
  it('orders teams by score and assigns positions', () => {
    expect(buildTeamScoreboard(teams).map((entry) => [entry.team.id, entry.position, entry.points])).toEqual([
      ['team-high', 1, 30],
      ['team-low', 2, 10],
      ['team-empty', 3, 0],
    ])
  })

  it('combines trivia and mimica points per participant', () => {
    expect(buildParticipantScoreBreakdown(teams[0], participants, board, mimicaScores)).toEqual([
      {
        participant: participants[0],
        points: 12,
        triviaPoints: 7,
        mimicaPoints: 5,
      },
    ])
  })

  it('skips team members that are no longer present in participants', () => {
    const teamWithMissingMember: TriviaTeam = {
      ...teams[0],
      members: ['missing', 'p1'],
    }

    expect(buildParticipantScoreBreakdown(teamWithMissingMember, participants, board, mimicaScores)).toHaveLength(1)
  })
})
