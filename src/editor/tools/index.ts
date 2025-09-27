import { basicToolGroup } from './basic'
import { perimeterToolGroup } from './perimeter'
import type { ToolManager } from './system/ToolManager'
import { testDataToolGroup } from './test-data'

// Export tool system components
export { ToolContextProvider } from './system/ToolContext'
export { MainToolbar } from '@/editor/toolbar/MainToolbar'
export { PropertiesPanel } from '@/editor/properties/PropertiesPanel'

// Export tool system types and hooks
export type { Tool, ToolGroup } from './system/types'
export {
  useToolManager,
  useToolManagerState,
  useActiveTool,
  useActiveToolId,
  useToolContext
} from './system/ToolContext'

// NEW: Export new tool store and definitions (Phase 1)
export {
  useToolStore,
  useActiveTool as useActiveToolNew,
  useActiveToolId as useActiveToolIdNew,
  useCanPopTool,
  useToolStackDepth,
  getActiveTool as getActiveToolNew,
  getActiveToolId as getActiveToolIdNew,
  getPreviousToolId,
  canPopTool,
  getToolStackDepth,
  getToolActions,
  pushTool,
  popTool,
  clearToDefaultTool,
  replaceTool,
  handleCanvasEvent
} from './store/toolStore'

export {
  TOOL_DEFINITIONS,
  TOOL_GROUPS,
  DEFAULT_TOOL,
  type ToolId,
  getToolById,
  getAllTools
} from './store/toolDefinitions'

// Export individual tool groups for external registration
export { basicToolGroup } from './basic'
export { perimeterToolGroup } from './perimeter'
export { testDataToolGroup } from './test-data'

/**
 * Register all available tools - simple and direct
 */
export function registerAllTools(manager: ToolManager): void {
  manager.registerToolGroup(basicToolGroup)
  manager.registerToolGroup(perimeterToolGroup)
  manager.registerToolGroup(testDataToolGroup)
}

/**
 * Initialize the tool system - register tools and activate default
 */
export function initializeToolSystem(manager: ToolManager): void {
  registerAllTools(manager)
  if (!manager.activateTool('basic.select')) {
    console.warn('✗ Failed to activate default tool')
  }
}
