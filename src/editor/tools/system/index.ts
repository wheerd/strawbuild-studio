// Export main types
export type { Tool, ToolGroup, BaseTool, ToolContext, CanvasEvent } from './types'
export type { SnapResult } from '@/editor/services/snapping/types'

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
