import { renderHook, act } from '@testing-library/react'
import { useScoringSystem } from '../../../../modules/control/hooks/useScoringSystem'
import type { TriviaParticipant } from '../../../../modules/trivia/types'

describe('useScoringSystem', () => {
  const participants: TriviaParticipant[] = [
    { id: 'p1', name: 'P1', role: 'player', teamId: 'team-1' },
    { id: 'p2', name: 'P2', role: 'player', teamId: 'team-1' },
    { id: 'p3', name: 'P3', role: 'player', teamId: 'team-2' },
  ]

  it('deve inicializar estados com valores padrão', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    expect(result.current.mode).toBe('quick')
    expect(result.current.distributions).toEqual([])
    expect(result.current.selectedMultiplier).toBe(1.0)
    expect(result.current.quickModeSelected).toBe(false)
    expect(result.current.selectedQuickOption).toBeNull()
    expect(result.current.quickOptions).toHaveLength(3)
  })

  it('deve aplicar opção rápida full-current', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const fullOption = result.current.quickOptions.find(o => o.id === 'full-current')!

    act(() => {
      result.current.applyQuickOption(fullOption)
    })

    expect(result.current.selectedQuickOption).toBe('full-current')
    expect(result.current.quickModeSelected).toBe(true)
    expect(result.current.distributions).toHaveLength(1)
    expect(result.current.distributions[0].teamId).toBe('team-1')
    expect(result.current.distributions[0].points).toBe(100)
  })

  it('deve aplicar opção rápida half-current', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const halfOption = result.current.quickOptions.find(o => o.id === 'half-current')!

    act(() => {
      result.current.applyQuickOption(halfOption)
    })

    expect(result.current.distributions[0].points).toBe(50)
  })

  it('deve aplicar opção rápida void', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const voidOption = result.current.quickOptions.find(o => o.id === 'void')!

    act(() => {
      result.current.applyQuickOption(voidOption)
    })

    expect(result.current.distributions).toHaveLength(0)
  })

  it('deve deselecionar opção rápida ao clicar novamente', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const fullOption = result.current.quickOptions.find(o => o.id === 'full-current')!

    act(() => {
      result.current.applyQuickOption(fullOption)
    })

    expect(result.current.selectedQuickOption).toBe('full-current')

    act(() => {
      result.current.applyQuickOption(fullOption)
    })

    expect(result.current.selectedQuickOption).toBeNull()
    expect(result.current.quickModeSelected).toBe(false)
    expect(result.current.distributions).toHaveLength(0)
  })

  it('deve atualizar distribuição de time', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    act(() => {
      result.current.updateTeamDistribution('team-1', 150)
    })

    expect(result.current.distributions).toHaveLength(1)
    expect(result.current.distributions[0].teamId).toBe('team-1')
    expect(result.current.distributions[0].points).toBe(150)
    expect(result.current.distributions[0].percentage).toBe(150)
  })

  it('deve remover distribuição quando points é 0', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    act(() => {
      result.current.updateTeamDistribution('team-1', 150)
    })

    expect(result.current.distributions).toHaveLength(1)

    act(() => {
      result.current.updateTeamDistribution('team-1', 0)
    })

    expect(result.current.distributions).toHaveLength(0)
  })

  it('deve filtrar participantes por time', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const teamParticipants = result.current.getTeamParticipants('team-1')
    expect(teamParticipants).toHaveLength(2)
    expect(teamParticipants[0].id).toBe('p1')
    expect(teamParticipants[1].id).toBe('p2')
  })

  it('deve validar scoring para modo quick', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    expect(result.current.isValid).toBe(false)

    const fullOption = result.current.quickOptions.find(o => o.id === 'full-current')!

    act(() => {
      result.current.applyQuickOption(fullOption)
    })

    expect(result.current.isValid).toBe(true)
  })

  it('deve validar scoring para modo advanced', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    act(() => {
      result.current.setMode('advanced')
    })

    expect(result.current.isValid).toBe(false)

    act(() => {
      result.current.updateTeamDistribution('team-1', 100)
    })

    expect(result.current.isValid).toBe(true)
  })

  it('deve limpar estados ao mudar mode', () => {
    const { result } = renderHook(() =>
      useScoringSystem(participants, 'team-1', 'p1', 100)
    )

    const fullOption = result.current.quickOptions.find(o => o.id === 'full-current')!

    act(() => {
      result.current.applyQuickOption(fullOption)
    })

    expect(result.current.quickModeSelected).toBe(true)

    act(() => {
      result.current.setMode('advanced')
    })

    expect(result.current.quickModeSelected).toBe(false)
    expect(result.current.selectedQuickOption).toBeNull()
    expect(result.current.distributions).toHaveLength(0)
  })
})

