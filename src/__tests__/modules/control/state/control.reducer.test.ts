import { controlDashboardReducer, initialControlDashboardState } from '@/modules/control/state/control.reducer'

describe('controlDashboardReducer', () => {
  it('patches modal and selection state without losing previous values', () => {
    const state = controlDashboardReducer(initialControlDashboardState, {
      type: 'patch',
      payload: {
        libraryOpen: true,
        selectedIds: { tileId: 'tile-1', columnId: 'column-1' },
      },
    })

    expect(state.libraryOpen).toBe(true)
    expect(state.selectedIds).toEqual({ tileId: 'tile-1', columnId: 'column-1' })
    expect(state.scoreboardOpen).toBe(false)
  })

  it('devolve o MESMO objeto de estado quando o patch não muda nenhum valor (bail-out)', () => {
    // Regressão do loop infinito ("Maximum update depth exceeded") nos modos
    // demo/online: efeitos com setters instáveis disparam patches redundantes
    // a cada render; sem bail-out, cada patch criava um objeto novo e
    // realimentava o ciclo de re-renders.
    const next = controlDashboardReducer(initialControlDashboardState, {
      type: 'patch',
      payload: {
        offlineOnboardingOpen: false,
        showOnboardingSuggestion: false,
      },
    })

    expect(next).toBe(initialControlDashboardState)
  })

  it('cria objeto novo quando ao menos um valor do patch muda', () => {
    const next = controlDashboardReducer(initialControlDashboardState, {
      type: 'patch',
      payload: {
        offlineOnboardingOpen: false,
        libraryOpen: true,
      },
    })

    expect(next).not.toBe(initialControlDashboardState)
    expect(next.libraryOpen).toBe(true)
  })
})
