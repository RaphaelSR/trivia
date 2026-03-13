export interface ControlConfirmActionConfig {
  title: string
  description: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export interface ControlDashboardState {
  selectedIds: { tileId: string; columnId: string } | null
  showAnswer: boolean
  scoreboardOpen: boolean
  libraryOpen: boolean
  libraryUnlocked: boolean
  pinModalOpen: boolean
  pinInput: string
  pinError: string
  themeModalOpen: boolean
  scoreboardAccordions: Record<string, boolean>
  teamsModalOpen: boolean
  mimicaModalOpen: boolean
  infoModalOpen: boolean
  filmRouletteOpen: boolean
  offlineOnboardingOpen: boolean
  showOnboardingSuggestion: boolean
  sessionManagerOpen: boolean
  resetGameModalOpen: boolean
  gameEndModalOpen: boolean
  gameEndNotified: boolean
  questionImportOpen: boolean
  scoreDetailOpen: boolean
  selectedParticipantId: string | null
  confirmActionOpen: boolean
  confirmActionConfig: ControlConfirmActionConfig | null
}

export type ControlDashboardAction = {
  type: 'patch'
  payload: Partial<ControlDashboardState>
}

export const initialControlDashboardState: ControlDashboardState = {
  selectedIds: null,
  showAnswer: false,
  scoreboardOpen: false,
  libraryOpen: false,
  libraryUnlocked: false,
  pinModalOpen: false,
  pinInput: '',
  pinError: '',
  themeModalOpen: false,
  scoreboardAccordions: {},
  teamsModalOpen: false,
  mimicaModalOpen: false,
  infoModalOpen: false,
  filmRouletteOpen: false,
  offlineOnboardingOpen: false,
  showOnboardingSuggestion: false,
  sessionManagerOpen: false,
  resetGameModalOpen: false,
  gameEndModalOpen: false,
  gameEndNotified: false,
  questionImportOpen: false,
  scoreDetailOpen: false,
  selectedParticipantId: null,
  confirmActionOpen: false,
  confirmActionConfig: null,
}

export function controlDashboardReducer(
  state: ControlDashboardState,
  action: ControlDashboardAction,
): ControlDashboardState {
  switch (action.type) {
    case 'patch':
      return {
        ...state,
        ...action.payload,
      }
    default:
      return state
  }
}
