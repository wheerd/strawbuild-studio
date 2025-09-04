import { create } from 'zustand'
import type { FloorId } from '@/types/ids'

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
  stageWidth: number
  stageHeight: number
}

export interface EditorState {
  activeFloorId: FloorId
  viewport: ViewportState
  showGrid: boolean
  gridSize: number // in mm
}

export interface EditorActions {
  setActiveFloor: (floorId: FloorId) => void
  setViewport: (viewport: Partial<ViewportState>) => void
  setStageDimensions: (width: number, height: number) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState(defaultFloorId: FloorId): EditorState {
  return {
    activeFloorId: defaultFloorId,
    viewport: {
      zoom: 0.15, // Better default zoom for real-world scale (3m room ≈ 450px)
      panX: 100, // Small offset from edge
      panY: 100, // Small offset from edge
      stageWidth: 800,
      stageHeight: 600
    },
    showGrid: true,
    gridSize: 1000 // 1m grid by default
  }
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  // Initialize with temporary floor ID - will be reset when model loads
  ...createInitialState('ground-floor' as FloorId),

  setActiveFloor: (floorId: FloorId) => {
    set({
      activeFloorId: floorId
    })
  },

  setViewport: (viewportUpdate: Partial<ViewportState>) => {
    const state = get()
    set({
      viewport: { ...state.viewport, ...viewportUpdate }
    })
  },

  setStageDimensions: (width: number, height: number) => {
    const state = get()
    set({
      viewport: { ...state.viewport, stageWidth: width, stageHeight: height }
    })
  },

  setShowGrid: (show: boolean) => {
    set({ showGrid: show })
  },

  setGridSize: (size: number) => {
    set({ gridSize: size })
  },

  reset: (defaultFloorId?: FloorId) => {
    const floorId = defaultFloorId ?? ('ground-floor' as FloorId)
    set(createInitialState(floorId))
  }
}))

// Selector hooks for optimized re-renders
export const useActiveFloorId = (): FloorId => useEditorStore(state => state.activeFloorId)
export const useViewport = (): ViewportState => useEditorStore(state => state.viewport)
