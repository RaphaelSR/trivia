import type { TriviaParticipant } from '../../trivia/types'

export type ParticipantDraft = {
  id: string
  name: string
  role: TriviaParticipant['role']
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
}

export type QuickScoringOption = {
  id: string
  title: string
  subtitle: string
  multiplier: number
  target: 'current-team' | 'other-team' | 'all-teams' | 'none'
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
  theme: string
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

