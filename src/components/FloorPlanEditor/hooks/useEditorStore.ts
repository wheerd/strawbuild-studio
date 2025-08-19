import { create } from 'zustand'
import type { Point2D } from '../../../types/model'

export type EditorTool = 'select' | 'wall' | 'room'
export type DragType = 'pan' | 'wall' | 'point' | 'selection'

export interface DragState {
  isDragging: boolean
  dragType: DragType
  startPos: Point2D
  dragEntityId?: string
}

export interface EditorState {
  activeTool: EditorTool
  isDrawing: boolean
  dragState: DragState
  snapDistance: number
  showSnapPreview: boolean
  snapPreviewPoint?: Point2D
  showGrid: boolean
  gridSize: number
  showRoomLabels: boolean
}

export interface EditorActions {
  setActiveTool: (tool: EditorTool) => void
  setIsDrawing: (isDrawing: boolean) => void
  startDrag: (dragType: DragType, startPos: Point2D, entityId?: string) => void
  endDrag: () => void
  setSnapDistance: (distance: number) => void
  setSnapPreview: (point?: Point2D) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  setShowRoomLabels: (show: boolean) => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState (): EditorState {
  return {
    activeTool: 'select',
    isDrawing: false,
    dragState: {
      isDragging: false,
      dragType: 'selection',
      startPos: { x: 0, y: 0 }
    },
    snapDistance: 20,
    showSnapPreview: false,
    showGrid: true,
    gridSize: 50,
    showRoomLabels: true
  }
}

export const useEditorStore = create<EditorStore>()((set) => ({
  ...createInitialState(),

  setActiveTool: (tool: EditorTool) => {
    set({ activeTool: tool, isDrawing: false })
  },

  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing })
  },

  startDrag: (dragType: DragType, startPos: Point2D, entityId?: string) => {
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
        startPos: { x: 0, y: 0 }
      }
    })
  },

  setSnapDistance: (distance: number) => {
    set({ snapDistance: distance })
  },

  setSnapPreview: (point?: Point2D) => {
    set({
      snapPreviewPoint: point,
      showSnapPreview: point !== undefined
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

  reset: () => {
    set(createInitialState())
  }
}))

export const useActiveTool = (): EditorTool => useEditorStore(state => state.activeTool)
export const useIsDrawing = (): boolean => useEditorStore(state => state.isDrawing)
export const useDragState = (): DragState => useEditorStore(state => state.dragState)
export const useSnapDistance = (): number => useEditorStore(state => state.snapDistance)
export const useShowSnapPreview = (): boolean => useEditorStore(state => state.showSnapPreview)
export const useSnapPreviewPoint = (): Point2D | undefined => useEditorStore(state => state.snapPreviewPoint)
export const useShowGrid = (): boolean => useEditorStore(state => state.showGrid)
export const useGridSize = (): number => useEditorStore(state => state.gridSize)


