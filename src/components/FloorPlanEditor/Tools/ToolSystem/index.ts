// Export main types
export type { Tool, ToolGroup, BaseTool, ToolContext, ContextAction, CanvasEvent } from './types'
export type { SnapResult } from '@/model/store/services/snapping/types'

// Export tool manager
export { ToolManager, toolManager } from './ToolManager'
export type { ToolManagerState } from './ToolManager'

// Export React context and hooks
export {
  ToolContextProvider,
  useToolManager,
  useToolManagerState,
  useToolContext,
  useActiveTool,
  useActiveToolId
} from './ToolContext'
