export type TriviaRole = 'host' | 'assistant' | 'player'

export type TriviaParticipant = {
  id: string
  name: string
  role: TriviaRole
  teamId?: string
}

export type TriviaTeam = {
  id: string
  name: string
  color: string
  order: number
  members: string[]
}

export type TriviaTheme = {
  id: string
  name: string
  palette: {
    background: string
    primary: string
    secondary: string
    accent: string
    surface: string
  }
  backgroundImageUrl?: string
}

export type TriviaQuestionTile = {
  id: string
  film: string
  points: number
  state: 'available' | 'active' | 'answered'
  question: string
  answer: string
}

export type TriviaColumn = {
  id: string
  filmId: string
  film: string
  theme?: {
    primary: string
    accent: string
    background: string
    text: string
  }
  tiles: TriviaQuestionTile[]
}

export type TriviaSession = {
  id: string
  title: string
  scheduledAt: string
  theme: TriviaTheme
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  board: TriviaColumn[]
  activeTeamId: string
  activeParticipantId: string | null
  turnSequence: string[]
}
