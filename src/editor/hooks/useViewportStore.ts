import { create } from 'zustand'

import { type Bounds2D, type Vec2, createVec2 } from '@/shared/geometry'

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
  stageWidth: number
  stageHeight: number
}

interface ViewportActions {
  setViewport: (viewport: Partial<ViewportState>) => void
  setStageDimensions: (width: number, height: number) => void
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  zoomBy: (factor: number) => number
  panBy: (deltaX: number, deltaY: number) => void

  worldToStage: (worldPos: Vec2) => { x: number; y: number }
  stageToWorld: (stagePos: { x: number; y: number }) => Vec2
  fitToView: (bounds: Bounds2D) => void

  reset: () => void
}

type ViewportStore = ViewportState & ViewportActions

const INITIAL_STATE: ViewportState = {
  zoom: 0.15, // Better default zoom for real-world scale (3m room ≈ 450px)
  panX: 100, // Small offset from edge
  panY: 100, // Small offset from edge
  stageWidth: 800,
  stageHeight: 600
}

const MIN_ZOOM = 0.001
const MAX_ZOOM = 2

const viewportStore = create<ViewportStore>()((set, get) => ({
  ...INITIAL_STATE,

  setViewport: (viewportUpdate: Partial<ViewportState>) => {
    const state = get()
    set({ ...state, ...viewportUpdate })
  },

  setStageDimensions: (width: number, height: number) => {
    set({ stageWidth: width, stageHeight: height })
  },

  setZoom: (zoom: number) => {
    // Clamp zoom to reasonable bounds
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    set({ zoom: clampedZoom })
  },

  setPan: (panX: number, panY: number) => {
    set({ panX, panY })
  },

  zoomBy: (factor: number): number => {
    const state = get()
    const newZoom = state.zoom * factor
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    set({ zoom: clampedZoom })
    return clampedZoom
  },

  panBy: (deltaX: number, deltaY: number) => {
    const state = get()
    set({
      panX: state.panX + deltaX,
      panY: state.panY + deltaY
    })
  },

  worldToStage: (worldPos: Vec2): { x: number; y: number } => {
    const viewport = get()
    return {
      x: worldPos[0] * viewport.zoom + viewport.panX,
      y: -(worldPos[1] * viewport.zoom + viewport.panY)
    }
  },

  stageToWorld: (stagePos: { x: number; y: number }): Vec2 => {
    const viewport = get()
    return createVec2((stagePos.x - viewport.panX) / viewport.zoom, -(stagePos.y - viewport.panY) / viewport.zoom)
  },

  fitToView: (bounds: Bounds2D): void => {
    const viewport = get()
    // Calculate bounds dimensions
    const boundsWidth = bounds.max[0] - bounds.min[0]
    const boundsHeight = bounds.max[1] - bounds.min[1]

    // If bounds are too small (e.g., single point), use minimum dimensions
    const minDimension = 1000 // 1 meter minimum
    const actualWidth = Math.max(boundsWidth, minDimension)
    const actualHeight = Math.max(boundsHeight, minDimension)

    // Calculate center of bounds
    const centerX = (bounds.min[0] + bounds.max[0]) / 2
    const centerY = -(bounds.min[1] + bounds.max[1]) / 2

    // Calculate zoom level to fit content with some padding
    const padding = 0.1 // 10% padding around content
    const availableWidth = viewport.stageWidth * (1 - padding * 2)
    const availableHeight = viewport.stageHeight * (1 - padding * 2)

    const zoomX = availableWidth / actualWidth
    const zoomY = availableHeight / actualHeight

    // Use the smaller zoom to ensure everything fits
    const newZoom = Math.min(zoomX, zoomY)

    // Clamp zoom to reasonable bounds
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))

    // Calculate pan to center the content
    const newPanX = viewport.stageWidth / 2 - centerX * clampedZoom
    const newPanY = viewport.stageHeight / 2 - centerY * clampedZoom

    set({
      zoom: clampedZoom,
      panX: newPanX,
      panY: newPanY
    })
  },

  reset: () => {
    set(INITIAL_STATE)
  }
}))

// Public API hooks - these are the only exports components should use
export const useZoom = (): number => viewportStore(state => state.zoom)
export const usePanX = (): number => viewportStore(state => state.panX)
export const usePanY = (): number => viewportStore(state => state.panY)
export const useStageWidth = (): number => viewportStore(state => state.stageWidth)
export const useStageHeight = (): number => viewportStore(state => state.stageHeight)

export const useViewportActions = (): ViewportActions => ({
  setViewport: viewportStore.getState().setViewport,
  setStageDimensions: viewportStore.getState().setStageDimensions,
  setZoom: viewportStore.getState().setZoom,
  setPan: viewportStore.getState().setPan,
  zoomBy: viewportStore.getState().zoomBy,
  panBy: viewportStore.getState().panBy,
  reset: viewportStore.getState().reset,
  worldToStage: viewportStore.getState().worldToStage,
  stageToWorld: viewportStore.getState().stageToWorld,
  fitToView: viewportStore.getState().fitToView
})

// Hook to get complete viewport state - primarily for testing
export const useViewportState = (): ViewportState => ({
  zoom: viewportStore(state => state.zoom),
  panX: viewportStore(state => state.panX),
  panY: viewportStore(state => state.panY),
  stageWidth: viewportStore(state => state.stageWidth),
  stageHeight: viewportStore(state => state.stageHeight)
})

// Internal export for testing only - don't use in components
export const _getViewportStore = () => viewportStore
