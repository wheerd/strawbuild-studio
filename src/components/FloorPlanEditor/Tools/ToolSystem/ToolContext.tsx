import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { toolManager, type ToolManagerState } from './ToolManager'
import type { Tool, ToolContext as IToolContext } from './types'
import { useModelStore } from '@/model/store'
import { useActiveStoreyId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { EntityId, SelectableId } from '@/types/ids'
import { useSelectionStore } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { entityHitTestService } from '@/components/FloorPlanEditor/services/EntityHitTestService'
import { useViewportActions } from '@/components/FloorPlanEditor/hooks/useViewportStore'

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
  const activeStoreyId = useActiveStoreyId()
  const { stageToWorld, worldToStage, fitToView } = useViewportActions()

  // Selection store actions
  const pushSelection = useSelectionStore(state => state.pushSelection)
  const popSelectionStore = useSelectionStore(state => state.popSelection)
  const clearSelectionStore = useSelectionStore(state => state.clearSelection)
  const getCurrentSelection = useSelectionStore(state => state.getCurrentSelection)
  const getSelectedEntityId = useSelectionStore(state => state.getSelectedEntityId)
  const getSelectionPath = useSelectionStore(state => state.getSelectionPath)

  // Subscribe to tool manager changes
  useEffect(() => {
    const unsubscribe = toolManager.subscribe(setToolManagerState)
    return unsubscribe
  }, [])

  // Create tool context implementation
  const toolContext = useMemo<IToolContext>(
    () => ({
      // Coordinate conversion from screen/stage coordinates to world coordinates
      getStageCoordinates: stageToWorld,
      getScreenCoordinates: worldToStage,

      // Entity discovery (on-demand) using original pointer coordinates
      findEntityAt: (pointerCoordinates: { x: number; y: number }) => {
        return entityHitTestService.findEntityAt(pointerCoordinates)
      },

      // Hierarchical selection management
      selectEntity: (entityId: EntityId): void => {
        pushSelection(entityId)
      },

      selectSubEntity: (subEntityId: SelectableId): void => {
        pushSelection(subEntityId)
      },

      popSelection: (): void => {
        popSelectionStore()
      },

      clearSelection: (): void => {
        clearSelectionStore()
      },

      getCurrentSelection: (): SelectableId | null => {
        return getCurrentSelection()
      },

      getSelectedEntityId: (): EntityId | null => {
        return getSelectedEntityId()
      },

      getSelectionPath: (): SelectableId[] => {
        return getSelectionPath()
      },

      // Store access (tools use these directly)
      getModelStore: () => modelStore.actions,
      getActiveStoreyId: () => activeStoreyId,

      // State access
      getActiveTool: (): Tool | null => {
        return toolManager.getActiveTool()
      },

      fitToView,

      // Tool activation
      activateTool: (toolId: string): boolean => {
        return toolManager.activateTool(toolId, toolContext)
      }
    }),
    [
      fitToView,
      worldToStage,
      stageToWorld,
      activeStoreyId,
      modelStore,
      pushSelection,
      popSelectionStore,
      clearSelectionStore,
      getCurrentSelection,
      getSelectedEntityId,
      getSelectionPath
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
