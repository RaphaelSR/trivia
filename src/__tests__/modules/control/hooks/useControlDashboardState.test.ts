import { renderHook, act } from '@testing-library/react'
import { useControlDashboardState } from '../../../../modules/control/hooks/useControlDashboardState'

describe('useControlDashboardState', () => {
  it('deve inicializar todos os estados com valores padrão', () => {
    const { result } = renderHook(() => useControlDashboardState())

    expect(result.current.selectedIds).toBeNull()
    expect(result.current.showAnswer).toBe(false)
    expect(result.current.scoreboardOpen).toBe(false)
    expect(result.current.libraryOpen).toBe(false)
    expect(result.current.libraryUnlocked).toBe(false)
    expect(result.current.pinModalOpen).toBe(false)
    expect(result.current.pinInput).toBe('')
    expect(result.current.pinError).toBe('')
    expect(result.current.themeModalOpen).toBe(false)
    expect(result.current.openAccordions).toEqual({})
    expect(result.current.teamsModalOpen).toBe(false)
    expect(result.current.mimicaModalOpen).toBe(false)
    expect(result.current.infoModalOpen).toBe(false)
    expect(result.current.filmRouletteOpen).toBe(false)
    expect(result.current.offlineOnboardingOpen).toBe(false)
    expect(result.current.showOnboardingSuggestion).toBe(false)
    expect(result.current.sessionManagerOpen).toBe(false)
    expect(result.current.resetGameModalOpen).toBe(false)
    expect(result.current.gameEndModalOpen).toBe(false)
    expect(result.current.gameEndNotified).toBe(false)
    expect(result.current.questionImportOpen).toBe(false)
  })

  it('deve permitir atualizar selectedIds', () => {
    const { result } = renderHook(() => useControlDashboardState())

    act(() => {
      result.current.setSelectedIds({ tileId: 'tile-1', columnId: 'col-1' })
    })

    expect(result.current.selectedIds).toEqual({ tileId: 'tile-1', columnId: 'col-1' })
  })

  it('deve permitir atualizar showAnswer', () => {
    const { result } = renderHook(() => useControlDashboardState())

    act(() => {
      result.current.setShowAnswer(true)
    })

    expect(result.current.showAnswer).toBe(true)
  })

  it('deve permitir atualizar scoreboardOpen', () => {
    const { result } = renderHook(() => useControlDashboardState())

    act(() => {
      result.current.setScoreboardOpen(true)
    })

    expect(result.current.scoreboardOpen).toBe(true)
  })

  it('deve permitir atualizar libraryOpen', () => {
    const { result } = renderHook(() => useControlDashboardState())

    act(() => {
      result.current.setLibraryOpen(true)
    })

    expect(result.current.libraryOpen).toBe(true)
  })

  it('deve permitir atualizar openAccordions', () => {
    const { result } = renderHook(() => useControlDashboardState())

    act(() => {
      result.current.setOpenAccordions({ 'col-1': true, 'col-2': false })
    })

    expect(result.current.openAccordions).toEqual({ 'col-1': true, 'col-2': false })
  })

  it('deve retornar selectedTile como null quando selectedIds é null', () => {
    const { result } = renderHook(() => useControlDashboardState())

    expect(result.current.selectedTile).toBeNull()
  })
})

