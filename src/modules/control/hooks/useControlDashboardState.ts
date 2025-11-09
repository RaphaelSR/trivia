import { useState, useMemo } from 'react'
import type { TriviaColumn, TriviaQuestionTile } from '@/modules/trivia/types'

/**
 * Hook para gerenciar estado local do ControlDashboard
 */
export function useControlDashboardState() {
  const [selectedIds, setSelectedIds] = useState<{ tileId: string; columnId: string } | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryUnlocked, setLibraryUnlocked] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [scoreboardAccordions, setScoreboardAccordions] = useState<Record<string, boolean>>({})
  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [mimicaModalOpen, setMimicaModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [filmRouletteOpen, setFilmRouletteOpen] = useState(false)
  const [offlineOnboardingOpen, setOfflineOnboardingOpen] = useState(false)
  const [showOnboardingSuggestion, setShowOnboardingSuggestion] = useState(false)
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const [resetGameModalOpen, setResetGameModalOpen] = useState(false)
  const [gameEndModalOpen, setGameEndModalOpen] = useState(false)
  const [gameEndNotified, setGameEndNotified] = useState(false)
  const [questionImportOpen, setQuestionImportOpen] = useState(false)

  const selectedTile = useMemo(() => {
    if (!selectedIds) return null
    // Esta lógica será movida para o componente que tem acesso ao board
    return null
  }, [selectedIds])

  return {
    selectedIds,
    setSelectedIds,
    showAnswer,
    setShowAnswer,
    scoreboardOpen,
    setScoreboardOpen,
    libraryOpen,
    setLibraryOpen,
    libraryUnlocked,
    setLibraryUnlocked,
    pinModalOpen,
    setPinModalOpen,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    themeModalOpen,
    setThemeModalOpen,
    scoreboardAccordions,
    setScoreboardAccordions,
    teamsModalOpen,
    setTeamsModalOpen,
    mimicaModalOpen,
    setMimicaModalOpen,
    infoModalOpen,
    setInfoModalOpen,
    filmRouletteOpen,
    setFilmRouletteOpen,
    offlineOnboardingOpen,
    setOfflineOnboardingOpen,
    showOnboardingSuggestion,
    setShowOnboardingSuggestion,
    sessionManagerOpen,
    setSessionManagerOpen,
    resetGameModalOpen,
    setResetGameModalOpen,
    gameEndModalOpen,
    setGameEndModalOpen,
    gameEndNotified,
    setGameEndNotified,
    questionImportOpen,
    setQuestionImportOpen,
    selectedTile,
  }
}

