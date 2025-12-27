import { create } from 'zustand'

interface Grid3DState {
  showGrid: boolean
}

export interface Grid3DActions {
  setShowGrid: (show: boolean) => void
  toggleGrid: () => void
}

type Grid3DStore = Grid3DState & { actions: Grid3DActions }

function createInitialGrid3DState(): Grid3DState {
  return {
    showGrid: true // Grid visible by default
  }
}

const useGrid3DStore = create<Grid3DStore>()(set => ({
  ...createInitialGrid3DState(),

  actions: {
    setShowGrid: (showGrid: boolean) => {
      set({ showGrid })
    },

    toggleGrid: () => {
      set(state => ({ showGrid: !state.showGrid }))
    }
  }
}))

export const useShowGrid3D = (): boolean => useGrid3DStore(state => state.showGrid)

export const useGrid3DActions = () => useGrid3DStore(state => state.actions)
