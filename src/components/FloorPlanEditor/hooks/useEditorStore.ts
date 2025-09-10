import { create } from 'zustand'
import type { StoreyId } from '@/types/ids'

export interface EditorState {
  activeStoreyId: StoreyId
  showGrid: boolean
  gridSize: number // in mm
}

export interface EditorActions {
  setActiveStorey: (storeyId: StoreyId) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState(defaultStoreyId: StoreyId): EditorState {
  return {
    activeStoreyId: defaultStoreyId,
    showGrid: true,
    gridSize: 1000 // 1m grid by default
  }
}

export const useEditorStore = create<EditorStore>()(set => ({
  // Initialize with temporary storey ID - will be reset when model loads
  ...createInitialState('ground-floor' as StoreyId),

  setActiveStorey: (activeStoreyId: StoreyId) => {
    set({ activeStoreyId })
  },

  setShowGrid: (showGrid: boolean) => {
    set({ showGrid })
  },

  setGridSize: (gridSize: number) => {
    set({ gridSize })
  },

  reset: (defaultStoreyId?: StoreyId) => {
    const storeyId = defaultStoreyId ?? ('ground-floor' as StoreyId)
    set(createInitialState(storeyId))
  }
}))

// Selector hooks for optimized re-renders
export const useActiveStoreyId = (): StoreyId => useEditorStore(state => state.activeStoreyId)
export const useShowGrid = (): boolean => useEditorStore(state => state.showGrid)
export const useGridSize = (): number => useEditorStore(state => state.gridSize)
