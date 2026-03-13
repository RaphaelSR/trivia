export interface ControlConfirmActionConfig {
  title: string
  description: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export interface ControlDashboardState {
  selectedIds: { tileId: string; columnId: string } | null
  activePanel: 'board' | 'scoreboard' | 'library' | 'films' | 'sessions' | 'theme' | 'teams'
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  showAnswer: boolean
  scoreboardOpen: boolean
  libraryOpen: boolean
  filmsOpen: boolean
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
  selectedFilmId: string | null
  libraryViewMode: 'editor' | 'overview'
  librarySearchQuery: string
  libraryPointsFilter: number | null
  librarySortMode: 'az' | 'questions' | 'points'
  filmCatalogViewMode: 'grid' | 'list'
  filmCatalogSortMode: 'recent' | 'az' | 'year'
  confirmActionOpen: boolean
  confirmActionConfig: ControlConfirmActionConfig | null
}

export type ControlDashboardAction = {
  type: 'patch'
  payload: Partial<ControlDashboardState>
}

export const initialControlDashboardState: ControlDashboardState = {
  selectedIds: null,
  activePanel: 'board',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  showAnswer: false,
  scoreboardOpen: false,
  libraryOpen: false,
  filmsOpen: false,
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
  selectedFilmId: null,
  libraryViewMode: 'editor',
  librarySearchQuery: '',
  libraryPointsFilter: null,
  librarySortMode: 'az',
  filmCatalogViewMode: 'grid',
  filmCatalogSortMode: 'recent',
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
