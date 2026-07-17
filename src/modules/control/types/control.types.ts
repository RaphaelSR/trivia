import type { TriviaParticipant } from '../../trivia/types'
import type { FlexibleScoreValue } from '../../game/domain/scoring'
import type { ThemeMode } from '@/shared/types/game'

export type ParticipantDraft = {
  id: string
  name: string
  role: TriviaParticipant['role']
  /** E-mail opcional para vinculação quando os recursos conectados estão ativos. */
  email?: string
}

export type TeamDraft = {
  id: string
  name: string
  color: string
  members: ParticipantDraft[]
}

export type FlexibleScoringMode = 'quick' | 'advanced' | 'custom'

export type PointDistribution = {
  teamId: string
  participantId?: string
  points: number
  percentage?: number
  valueKind?: FlexibleScoreValue['kind']
  suggested?: boolean
}

export type QuickScoringTarget =
  | 'current-team'
  | 'other-team'
  | 'all-teams'
  | 'manual'
  | 'none'

export type QuickScoringDistributionTemplate = {
  teamId?: string
  participantId?: string
  target?: 'current-team' | 'team'
  value?: FlexibleScoreValue
}

export type QuickScoringOption = {
  id: string
  title: string
  subtitle: string
  multiplier: number
  target: QuickScoringTarget
  scoringValue?: FlexibleScoreValue
  distributions?: QuickScoringDistributionTemplate[]
}

export type ResetGameOptions = {
  teams: boolean
  participants: boolean
  questions: boolean
  themes: boolean
  points: boolean
  films: boolean
}

export type OnboardingConfig = {
  theme: ThemeMode
  pin: string
  sessionTitle: string
  sessionDate: string
  customFilms: Array<{
    name: string
    year?: number
    genre?: string
    streaming?: string
    link?: string
    notes?: string
  }>
  teams: Array<{
    name: string
    color: string
    members: string[]
  }>
}
