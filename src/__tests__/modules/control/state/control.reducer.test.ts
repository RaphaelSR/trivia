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
})
