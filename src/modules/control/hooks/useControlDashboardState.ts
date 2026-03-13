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
    showAnswer: state.showAnswer,
    setShowAnswer: (value: boolean) => setStateValue('showAnswer', value),
    scoreboardOpen: state.scoreboardOpen,
    setScoreboardOpen: (value: boolean) => setStateValue('scoreboardOpen', value),
    libraryOpen: state.libraryOpen,
    setLibraryOpen: (value: boolean) => setStateValue('libraryOpen', value),
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
    selectedTile,
    confirmActionOpen: state.confirmActionOpen,
    setConfirmActionOpen: (value: boolean) => setStateValue('confirmActionOpen', value),
    confirmActionConfig: state.confirmActionConfig,
    setConfirmActionConfig: (value: ControlConfirmActionConfig | null) => setStateValue('confirmActionConfig', value),
  }
}
