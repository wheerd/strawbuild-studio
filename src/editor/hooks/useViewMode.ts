import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type ViewMode = 'walls' | 'floors' | 'roofs'

interface ViewModeState {
  mode: ViewMode
}

interface ViewModeActions {
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
  ensureMode: (mode: ViewMode) => void
}

type ViewModeStore = ViewModeState & { actions: ViewModeActions }

const useViewModeStore = create<ViewModeStore>()(
  devtools(
    set => ({
      mode: 'walls',
      actions: {
        setMode: mode => set(state => (state.mode === mode ? {} : { mode }), false, 'view-mode/set'),
        toggleMode: () =>
          set(
            state => ({
              mode: state.mode === 'walls' ? 'floors' : 'walls'
            }),
            false,
            'view-mode/toggle'
          ),
        ensureMode: mode => set(state => (state.mode === mode ? {} : { mode }), false, 'view-mode/ensure')
      }
    }),
    { name: 'view-mode-store' }
  )
)

export function useViewMode(): ViewMode {
  return useViewModeStore(state => state.mode)
}

export function useViewModeActions(): ViewModeActions {
  return useViewModeStore(state => state.actions)
}

export const getViewModeActions = (): ViewModeActions => {
  return useViewModeStore.getState().actions
}

export const getCurrentViewMode = (): ViewMode => useViewModeStore.getState().mode
