import { useMemo, useReducer } from 'react'
import {
  controlDashboardReducer,
  initialControlDashboardState,
  type ControlDashboardState,
  type ControlConfirmActionConfig,
} from '../state/control.reducer'

/**
 * Hook para gerenciar estado local do ControlDashboard usando reducer.
 */
export function useControlDashboardState() {
  const [state, dispatch] = useReducer(controlDashboardReducer, initialControlDashboardState)

  const setStateValue = <K extends keyof ControlDashboardState>(key: K, value: ControlDashboardState[K]) => {
    dispatch({ type: 'patch', payload: { [key]: value } as Partial<ControlDashboardState> })
  }

  const selectedTile = useMemo(() => {
    if (!state.selectedIds) return null
    return null
  }, [state.selectedIds])

  return {
    selectedIds: state.selectedIds,
    setSelectedIds: (value: ControlDashboardState['selectedIds']) => setStateValue('selectedIds', value),
    activePanel: state.activePanel,
    setActivePanel: (value: ControlDashboardState['activePanel']) => setStateValue('activePanel', value),
    sidebarCollapsed: state.sidebarCollapsed,
    setSidebarCollapsed: (value: boolean) => setStateValue('sidebarCollapsed', value),
    mobileSidebarOpen: state.mobileSidebarOpen,
    setMobileSidebarOpen: (value: boolean) => setStateValue('mobileSidebarOpen', value),
    showAnswer: state.showAnswer,
    setShowAnswer: (value: boolean) => setStateValue('showAnswer', value),
    scoreboardOpen: state.scoreboardOpen,
    setScoreboardOpen: (value: boolean) => setStateValue('scoreboardOpen', value),
    libraryOpen: state.libraryOpen,
    setLibraryOpen: (value: boolean) => setStateValue('libraryOpen', value),
    filmsOpen: state.filmsOpen,
    setFilmsOpen: (value: boolean) => setStateValue('filmsOpen', value),
    libraryUnlocked: state.libraryUnlocked,
    setLibraryUnlocked: (value: boolean) => setStateValue('libraryUnlocked', value),
    pinModalOpen: state.pinModalOpen,
    setPinModalOpen: (value: boolean) => setStateValue('pinModalOpen', value),
    pinInput: state.pinInput,
    setPinInput: (value: string) => setStateValue('pinInput', value),
    pinError: state.pinError,
    setPinError: (value: string) => setStateValue('pinError', value),
    themeModalOpen: state.themeModalOpen,
    setThemeModalOpen: (value: boolean) => setStateValue('themeModalOpen', value),
    scoreboardAccordions: state.scoreboardAccordions,
    setScoreboardAccordions: (value: Record<string, boolean>) => setStateValue('scoreboardAccordions', value),
    teamsModalOpen: state.teamsModalOpen,
    setTeamsModalOpen: (value: boolean) => setStateValue('teamsModalOpen', value),
    mimicaModalOpen: state.mimicaModalOpen,
    setMimicaModalOpen: (value: boolean) => setStateValue('mimicaModalOpen', value),
    infoModalOpen: state.infoModalOpen,
    setInfoModalOpen: (value: boolean) => setStateValue('infoModalOpen', value),
    filmRouletteOpen: state.filmRouletteOpen,
    setFilmRouletteOpen: (value: boolean) => setStateValue('filmRouletteOpen', value),
    offlineOnboardingOpen: state.offlineOnboardingOpen,
    setOfflineOnboardingOpen: (value: boolean) => setStateValue('offlineOnboardingOpen', value),
    showOnboardingSuggestion: state.showOnboardingSuggestion,
    setShowOnboardingSuggestion: (value: boolean) => setStateValue('showOnboardingSuggestion', value),
    sessionManagerOpen: state.sessionManagerOpen,
    setSessionManagerOpen: (value: boolean) => setStateValue('sessionManagerOpen', value),
    resetGameModalOpen: state.resetGameModalOpen,
    setResetGameModalOpen: (value: boolean) => setStateValue('resetGameModalOpen', value),
    gameEndModalOpen: state.gameEndModalOpen,
    setGameEndModalOpen: (value: boolean) => setStateValue('gameEndModalOpen', value),
    gameEndNotified: state.gameEndNotified,
    setGameEndNotified: (value: boolean) => setStateValue('gameEndNotified', value),
    questionImportOpen: state.questionImportOpen,
    setQuestionImportOpen: (value: boolean) => setStateValue('questionImportOpen', value),
    scoreDetailOpen: state.scoreDetailOpen,
    setScoreDetailOpen: (value: boolean) => setStateValue('scoreDetailOpen', value),
    selectedParticipantId: state.selectedParticipantId,
    setSelectedParticipantId: (value: string | null) => setStateValue('selectedParticipantId', value),
    selectedFilmId: state.selectedFilmId,
    setSelectedFilmId: (value: string | null) => setStateValue('selectedFilmId', value),
    libraryViewMode: state.libraryViewMode,
    setLibraryViewMode: (value: ControlDashboardState['libraryViewMode']) => setStateValue('libraryViewMode', value),
    librarySearchQuery: state.librarySearchQuery,
    setLibrarySearchQuery: (value: string) => setStateValue('librarySearchQuery', value),
    libraryPointsFilter: state.libraryPointsFilter,
    setLibraryPointsFilter: (value: number | null) => setStateValue('libraryPointsFilter', value),
    librarySortMode: state.librarySortMode,
    setLibrarySortMode: (value: ControlDashboardState['librarySortMode']) => setStateValue('librarySortMode', value),
    filmCatalogViewMode: state.filmCatalogViewMode,
    setFilmCatalogViewMode: (value: ControlDashboardState['filmCatalogViewMode']) => setStateValue('filmCatalogViewMode', value),
    filmCatalogSortMode: state.filmCatalogSortMode,
    setFilmCatalogSortMode: (value: ControlDashboardState['filmCatalogSortMode']) => setStateValue('filmCatalogSortMode', value),
    selectedTile,
    confirmActionOpen: state.confirmActionOpen,
    setConfirmActionOpen: (value: boolean) => setStateValue('confirmActionOpen', value),
    confirmActionConfig: state.confirmActionConfig,
    setConfirmActionConfig: (value: ControlConfirmActionConfig | null) => setStateValue('confirmActionConfig', value),
  }
}
