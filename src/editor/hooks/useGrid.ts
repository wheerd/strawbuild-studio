import { create } from 'zustand'

interface GridState {
  showGrid: boolean
  gridSize: number // in mm
}

export interface GridActions {
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
}

type GridStore = GridState & { actions: GridActions }

function createInitialGridState(): GridState {
  return {
    showGrid: true,
    gridSize: 1000 // 1m grid by default
  }
}

const useGridStore = create<GridStore>()(set => ({
  ...createInitialGridState(),

  actions: {
    setShowGrid: (showGrid: boolean) => {
      set({ showGrid })
    },

    setGridSize: (gridSize: number) => {
      set({ gridSize })
    }
  }
}))

export const useShowGrid = (): boolean => useGridStore(state => state.showGrid)
export const useGridSize = (): number => useGridStore(state => state.gridSize)

export const useGridActions = () => useGridStore(state => state.actions)
