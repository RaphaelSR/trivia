import { DEFAULT_DEMO_SESSION_CONFIG } from '../../../shared/constants/game'
import type { DemoSessionConfig } from '../../../shared/types/game'
import { questionBank } from '../../../data/questionBank'
import { getFilmMetadata } from '../../../data/films'
import { slugify } from '../../../utils/slugify'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '../types'
import { createBalancedTurnSequence } from './createBalancedTurnSequence'

const demoTeamBlueprints = [
  { name: 'Absolute Cinema', color: '#4f46e5' },
  { name: 'Darth Aperol', color: '#22d3ee' },
  { name: 'Pipoca & Caos', color: '#f97316' },
  { name: 'Plot Twist Club', color: '#ef4444' },
  { name: 'Cineclube After', color: '#10b981' },
]

const demoParticipantNames = [
  'Joao',
  'Cris',
  'Dani',
  'Cami',
  'Mi',
  'Rapha',
  'Leo',
  'Bia',
  'Gui',
  'Nina',
  'Theo',
  'Luca',
  'Mari',
  'Caio',
  'Iris',
  'Noah',
  'Lia',
  'Pedro',
  'Tati',
  'Rafa',
  'Gabi',
  'Maya',
  'Enzo',
  'Bruna',
  'Vitor',
]

function normalizeDemoConfig(config?: DemoSessionConfig): DemoSessionConfig {
  return {
    teamCount: config?.teamCount ?? DEFAULT_DEMO_SESSION_CONFIG.teamCount,
    membersPerTeam: config?.membersPerTeam ?? DEFAULT_DEMO_SESSION_CONFIG.membersPerTeam,
    questionCount: config?.questionCount ?? DEFAULT_DEMO_SESSION_CONFIG.questionCount,
  }
}

function buildDemoTeams(config: DemoSessionConfig): {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
} {
  const participants: TriviaParticipant[] = []
  const teams = demoTeamBlueprints.slice(0, config.teamCount).map((blueprint, teamIndex) => {
    const teamId = `team-${teamIndex + 1}`
    const members = Array.from({ length: config.membersPerTeam }, (_, memberIndex) => {
      const globalIndex = teamIndex * config.membersPerTeam + memberIndex
      const participantId = `participant-${globalIndex + 1}`
      const fallbackName = `Jogador ${globalIndex + 1}`
      participants.push({
        id: participantId,
        name: demoParticipantNames[globalIndex] ?? fallbackName,
        role: globalIndex === 0 ? 'host' : 'player',
        teamId,
      })
      return participantId
    })

    return {
      id: teamId,
      name: blueprint.name,
      color: blueprint.color,
      order: teamIndex,
      members,
      score: 0,
    }
  })

  return { teams, participants }
}

function buildDemoBoard(questionCount: number) {
  const films = Object.keys(questionBank)
  const uniqueEntriesByFilm = films.map((filmId) => {
    const metadata = getFilmMetadata(filmId)
    const seenPoints = new Set<number>()
    const entries = (questionBank[filmId] ?? []).filter((entry) => {
      if (seenPoints.has(entry.points)) return false
      seenPoints.add(entry.points)
      return true
    })

    return { filmId, metadata, entries }
  })

  const maxQuestions = uniqueEntriesByFilm.reduce((total, film) => total + film.entries.length, 0)
  const targetQuestionCount = Math.min(questionCount, maxQuestions)
  const selectedEntriesByFilm = new Map<string, typeof uniqueEntriesByFilm[number]['entries']>()

  uniqueEntriesByFilm.forEach(({ filmId }) => {
    selectedEntriesByFilm.set(filmId, [])
  })

  let selectedCount = 0
  let entryIndex = 0

  while (selectedCount < targetQuestionCount) {
    let addedInPass = false

    uniqueEntriesByFilm.forEach(({ filmId, entries }) => {
      if (selectedCount >= targetQuestionCount) {
        return
      }

      const nextEntry = entries[entryIndex]
      if (!nextEntry) {
        return
      }

      selectedEntriesByFilm.get(filmId)?.push(nextEntry)
      selectedCount += 1
      addedInPass = true
    })

    if (!addedInPass) {
      break
    }

    entryIndex += 1
  }

  return uniqueEntriesByFilm
    .map(({ filmId, metadata }) => {
      const selectedEntries = selectedEntriesByFilm.get(filmId) ?? []

      if (!selectedEntries.length) {
        return null
      }

      return {
        id: `${slugify(metadata.displayName)}-column`,
        filmId,
        film: metadata.displayName,
        theme: metadata.theme,
        tiles: selectedEntries.map((entry, index) => ({
          id: `${slugify(metadata.displayName)}-${entry.points}-${index}`,
          filmId,
          film: metadata.displayName,
          points: entry.points,
          state: 'available' as const,
          question: entry.question,
          answer: entry.answer,
        })),
      }
    })
    .filter((column): column is NonNullable<typeof column> => column !== null)
}

export function createLocalSession(config?: DemoSessionConfig): TriviaSession {
  const demoConfig = normalizeDemoConfig(config)
  const { teams, participants } = buildDemoTeams(demoConfig)
  const board = buildDemoBoard(demoConfig.questionCount)
  const totalQuestions = board.reduce((total, column) => total + column.tiles.length, 0)
  const turnSequence = createBalancedTurnSequence(teams, totalQuestions)
  const activeParticipantId = turnSequence[0] ?? null

  return {
    id: 'local-session',
    title: `Trivia Demo ${demoConfig.teamCount}x${demoConfig.membersPerTeam}`,
    scheduledAt: new Date().toISOString(),
    theme: {
      id: 'default-dark',
      name: 'Tema Escuro',
      palette: {
        background: 'var(--color-background)',
        primary: '#818cf8',
        secondary: '#38bdf8',
        accent: '#22c55e',
        surface: '#0f172a',
      },
    },
    teams,
    participants,
    board,
    activeTeamId: teams[0]?.id ?? '',
    activeParticipantId,
    activeTurnIndex: activeParticipantId ? 0 : 0,
    turnSequence,
    mimicaScores: [],
  }
}
