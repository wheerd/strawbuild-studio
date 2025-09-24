import { create } from 'zustand'

export interface EditorState {
  showGrid: boolean
  gridSize: number // in mm
}

export interface EditorActions {
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState(): EditorState {
  return {
    showGrid: true,
    gridSize: 1000 // 1m grid by default
  }
}

export const useEditorStore = create<EditorStore>()(set => ({
  // Initialize with default grid settings
  ...createInitialState(),

  setShowGrid: (showGrid: boolean) => {
    set({ showGrid })
  },

  setGridSize: (gridSize: number) => {
    set({ gridSize })
  },

  reset: () => {
    set(createInitialState())
  }
}))

// Selector hooks for optimized re-renders
export const useShowGrid = (): boolean => useEditorStore(state => state.showGrid)
export const useGridSize = (): number => useEditorStore(state => state.gridSize)
