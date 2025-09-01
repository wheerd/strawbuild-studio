import { create } from 'zustand'
import { createVec2, type Vec2 } from '@/types/geometry'
import type { EntityId, FloorId, PointId } from '@/types/ids'
import { isPointId, isWallId, isRoomId } from '@/types/ids'
import { type SnapResult } from '@/model/store/services/snapping'

export type EditorTool = 'select' | 'wall' | 'room'
export type DragType = 'pan' | 'wall' | 'point' | 'selection'
export type ViewMode = 'plan' | '3d' | 'elevation'

export interface DragState {
  isDragging: boolean
  dragType: DragType
  startPos: Vec2
  dragEntityId?: string
}

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
  stageWidth: number
  stageHeight: number
}

export interface EditorState {
  activeTool: EditorTool
  isDrawing: boolean
  dragState: DragState
  // Unified snap state
  currentSnapTarget?: Vec2
  currentSnapFromPoint?: Vec2
  currentSnapFromPointId?: PointId // Store the ID to avoid expensive lookups
  currentSnapResult?: SnapResult
  showGrid: boolean
  gridSize: number
  showRoomLabels: boolean
  activeFloorId: FloorId
  selectedEntityId?: EntityId
  viewMode: ViewMode
  viewport: ViewportState
}

export interface EditorActions {
  setActiveTool: (tool: EditorTool) => void
  setIsDrawing: (isDrawing: boolean) => void
  startDrag: (dragType: DragType, startPos: Vec2, entityId?: string) => void
  endDrag: () => void
  // Unified snap actions
  updateSnapReference: (fromPoint: Vec2 | null, fromPointId: PointId | null) => void
  updateSnapTarget: (target: Vec2) => void
  updateSnapResult: (result: SnapResult | null) => void
  clearSnapState: () => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  setShowRoomLabels: (show: boolean) => void
  setActiveFloor: (floorId: FloorId) => void
  setSelectedEntity: (entityId?: EntityId) => void
  selectEntity: (entityId: EntityId) => void
  clearSelection: () => void
  deleteSelectedEntity: () => void
  setViewMode: (viewMode: ViewMode) => void
  setViewport: (viewport: Partial<ViewportState>) => void
  setStageDimensions: (width: number, height: number) => void
  fitToView: () => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState(defaultFloorId: FloorId): EditorState {
  return {
    activeTool: 'select',
    isDrawing: false,
    dragState: {
      isDragging: false,
      dragType: 'selection',
      startPos: createVec2(0, 0)
    },
    showGrid: true,
    gridSize: 500, // 500mm (0.5m) grid for real-world scale
    showRoomLabels: true,
    activeFloorId: defaultFloorId,
    selectedEntityId: undefined,
    viewMode: 'plan',
    viewport: {
      zoom: 0.15, // Better default zoom for real-world scale (3m room ≈ 450px)
      panX: 100, // Small offset from edge
      panY: 100, // Small offset from edge
      stageWidth: 800,
      stageHeight: 600
    }
  }
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  // Initialize with temporary floor ID - will be reset when model loads
  ...createInitialState('ground-floor' as FloorId),

  setActiveTool: (tool: EditorTool) => {
    set({
      activeTool: tool,
      isDrawing: false,
      currentSnapTarget: undefined,
      currentSnapFromPoint: undefined,
      currentSnapFromPointId: undefined,
      currentSnapResult: undefined
    })
  },

  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing })
  },

  startDrag: (dragType: DragType, startPos: Vec2, entityId?: string) => {
    set({
      dragState: {
        isDragging: true,
        dragType,
        startPos,
        dragEntityId: entityId
      }
    })
  },

  endDrag: () => {
    set({
      dragState: {
        isDragging: false,
        dragType: 'selection',
        startPos: createVec2(0, 0)
      }
    })
  },

  setShowGrid: (show: boolean) => {
    set({ showGrid: show })
  },

  setGridSize: (size: number) => {
    set({ gridSize: size })
  },

  setShowRoomLabels: (show: boolean) => {
    set({ showRoomLabels: show })
  },

  setActiveFloor: (floorId: FloorId) => {
    set({
      activeFloorId: floorId,
      selectedEntityId: undefined
    })
  },

  setSelectedEntity: (entityId?: EntityId) => {
    set({ selectedEntityId: entityId })
  },

  selectEntity: (entityId: EntityId) => {
    const state = get()
    // Toggle selection - if already selected, deselect; otherwise select
    const selectedEntityId = state.selectedEntityId === entityId ? undefined : entityId
    set({ selectedEntityId })
  },

  clearSelection: () => {
    set({ selectedEntityId: undefined })
  },

  deleteSelectedEntity: () => {
    const state = get()
    if (state.selectedEntityId == null) return

    const entityId = state.selectedEntityId

    // Import the model store dynamically to avoid circular dependencies
    import('@/model/store')
      .then(({ useModelStore }) => {
        const modelStore = useModelStore.getState()

        // Use type guards to determine entity type and call appropriate remove function
        if (isPointId(entityId)) {
          modelStore.removePoint(entityId)
        } else if (isWallId(entityId)) {
          modelStore.removeWall(entityId)
        } else if (isRoomId(entityId)) {
          modelStore.removeRoom(entityId)
        }

        // Clear selection after deletion
        set({ selectedEntityId: undefined })
      })
      .catch(error => {
        console.error('Failed to delete entity:', error)
      })
  },

  setViewMode: (viewMode: ViewMode) => {
    set({ viewMode })
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

  fitToView: () => {
    // This will be implemented with the bounds from the model store
    // For now, it's a placeholder that will be called from the component
    // TODO: Implement this
  },

  updateSnapReference(fromPoint, fromPointId) {
    set({
      currentSnapFromPoint: fromPoint ?? undefined,
      currentSnapFromPointId: fromPointId ?? undefined
    })
  },

  updateSnapResult(result) {
    set({ currentSnapResult: result ?? undefined })
  },

  updateSnapTarget(target) {
    set({ currentSnapTarget: target })
  },

  clearSnapState: () => {
    set({
      currentSnapTarget: undefined,
      currentSnapFromPoint: undefined,
      currentSnapFromPointId: undefined,
      currentSnapResult: undefined
    })
  },

  reset: (defaultFloorId?: FloorId) => {
    const floorId = defaultFloorId ?? ('ground-floor' as FloorId)
    set(createInitialState(floorId))
  }
}))

// Selector hooks for optimized re-renders
export const useActiveTool = (): EditorTool => useEditorStore(state => state.activeTool)
export const useIsDrawing = (): boolean => useEditorStore(state => state.isDrawing)

export const useDragState = (): DragState => useEditorStore(state => state.dragState)
// Unified snap state selectors
export const useCurrentSnapResult = (): SnapResult | undefined => useEditorStore(state => state.currentSnapResult)
export const useCurrentSnapTarget = (): Vec2 | undefined => useEditorStore(state => state.currentSnapTarget)
export const useCurrentSnapFromPoint = (): Vec2 | undefined => useEditorStore(state => state.currentSnapFromPoint)
export const useCurrentSnapFromPointId = (): PointId | undefined =>
  useEditorStore(state => state.currentSnapFromPointId)
export const useShowGrid = (): boolean => useEditorStore(state => state.showGrid)
export const useEditorGridSize = (): number => useEditorStore(state => state.gridSize)
export const useShowRoomLabels = (): boolean => useEditorStore(state => state.showRoomLabels)
export const useActiveFloorId = (): FloorId => useEditorStore(state => state.activeFloorId)
export const useSelectedEntity = (): string | undefined => useEditorStore(state => state.selectedEntityId)
export const useViewMode = (): ViewMode => useEditorStore(state => state.viewMode)
export const useViewport = (): ViewportState => useEditorStore(state => state.viewport)
