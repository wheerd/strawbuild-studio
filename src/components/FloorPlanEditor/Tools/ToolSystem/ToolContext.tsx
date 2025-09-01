import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { toolManager, type ToolManagerState } from './ToolManager'
import type { Tool, ToolContext as IToolContext } from './types'
import { useModelStore } from '@/model/store'
import { useEditorStore, useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { defaultSnappingService } from '@/model/store/services/snapping/SnappingService'
import { useSnappingContext } from '@/components/FloorPlanEditor/hooks/useSnappingContext'
import { createVec2, type Vec2 } from '@/types/geometry'
import type { EntityId, PointId } from '@/types/ids'
import type { SnapResult as ModelSnapResult } from '@/model/store/services/snapping/types'

interface ToolContextProviderProps {
  children: React.ReactNode
}

const ToolSystemContext = createContext<{
  toolManagerState: ToolManagerState
  toolManager: typeof toolManager
  toolContext: IToolContext
} | null>(null)

export function ToolContextProvider({ children }: ToolContextProviderProps): React.JSX.Element {
  const [toolManagerState, setToolManagerState] = useState<ToolManagerState>(toolManager.getState())
  const modelStore = useModelStore()
  const activeFloorId = useActiveFloorId()
  const viewport = useEditorStore(state => state.viewport)
  const snappingContext = useSnappingContext()

  // Editor store actions
  const updateSnapReference = useEditorStore(state => state.updateSnapReference)
  const updateSnapTarget = useEditorStore(state => state.updateSnapTarget)
  const updateSnapResult = useEditorStore(state => state.updateSnapResult)
  const clearSnapState = useEditorStore(state => state.clearSnapState)
  const selectEntity = useEditorStore(state => state.selectEntity)
  const clearSelection = useEditorStore(state => state.clearSelection)
  const selectedEntityId = useEditorStore(state => state.selectedEntityId)
  const setActiveTool = useEditorStore(state => state.setActiveTool)

  // Subscribe to tool manager changes
  useEffect(() => {
    const unsubscribe = toolManager.subscribe(setToolManagerState)
    return unsubscribe
  }, [])

  // Sync tool manager state with editor store (for backward compatibility)
  useEffect(() => {
    const toolId = toolManagerState.activeToolId
    if (toolId) {
      // Map tool manager tool IDs to editor store tool names
      let editorTool: 'select' | 'wall' | 'room' = 'select'
      if (toolId.startsWith('basic.select')) {
        editorTool = 'select'
      } else if (toolId.startsWith('wall.')) {
        editorTool = 'wall'
      } else if (toolId.startsWith('room.')) {
        editorTool = 'room'
      }
      setActiveTool(editorTool)
    }
  }, [toolManagerState.activeToolId, setActiveTool])

  // Create tool context implementation
  const toolContext = useMemo<IToolContext>(
    () => ({
      // Coordinate conversion from screen/stage coordinates to world coordinates
      getStageCoordinates: (event: { x: number; y: number }): Vec2 => {
        // Convert screen coordinates to world coordinates by accounting for pan and zoom
        return createVec2((event.x - viewport.panX) / viewport.zoom, (event.y - viewport.panY) / viewport.zoom)
      },

      getScreenCoordinates: (point: Vec2): { x: number; y: number } => {
        // Convert world coordinates back to screen coordinates
        return {
          x: point[0] * viewport.zoom + viewport.panX,
          y: point[1] * viewport.zoom + viewport.panY
        }
      },

      // Snapping
      findSnapPoint: (point: Vec2): ModelSnapResult | null => {
        updateSnapTarget(point)
        const snapResult = defaultSnappingService.findSnapResult(point, snappingContext)
        updateSnapResult(snapResult)
        return snapResult
      },

      updateSnapReference: (fromPoint: Vec2 | null, fromPointId: string | null): void => {
        updateSnapReference(fromPoint, fromPointId as PointId | null)
      },

      updateSnapTarget,
      clearSnapState,

      // Selection management (single entity only)
      selectEntity,
      clearSelection,

      getSelectedEntityId: (): EntityId | null => {
        return selectedEntityId ?? null
      },

      // Store access (tools use these directly)
      getModelStore: () => modelStore,
      getActiveFloorId: () => activeFloorId,

      // State access
      getActiveTool: (): Tool | null => {
        return toolManager.getActiveTool()
      },

      getViewport: () => viewport,

      // Tool activation
      activateTool: (toolId: string): boolean => {
        return toolManager.activateTool(toolId)
      }
    }),
    [
      viewport,
      activeFloorId,
      snappingContext,
      modelStore,
      updateSnapReference,
      updateSnapTarget,
      updateSnapResult,
      clearSnapState,
      selectEntity,
      clearSelection,
      selectedEntityId
    ]
  )

  const contextValue = useMemo(
    () => ({
      toolManagerState,
      toolManager,
      toolContext
    }),
    [toolManagerState, toolContext]
  )

  return <ToolSystemContext.Provider value={contextValue}>{children}</ToolSystemContext.Provider>
}

// Hooks
export function useToolManager() {
  const context = useContext(ToolSystemContext)
  if (!context) {
    throw new Error('useToolManager must be used within a ToolContextProvider')
  }
  return context.toolManager
}

export function useToolManagerState(): ToolManagerState {
  const context = useContext(ToolSystemContext)
  if (!context) {
    throw new Error('useToolManagerState must be used within a ToolContextProvider')
  }
  return context.toolManagerState
}

export function useToolContext(): IToolContext {
  const context = useContext(ToolSystemContext)
  if (!context) {
    throw new Error('useToolContext must be used within a ToolContextProvider')
  }
  return context.toolContext
}

export function useActiveTool(): Tool | null {
  const state = useToolManagerState()
  return state.activeTool
}

export function useActiveToolId(): string | null {
  const state = useToolManagerState()
  return state.activeToolId
}
