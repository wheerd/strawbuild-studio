import type { ToolManager } from './system/ToolManager'
import { basicToolGroup } from './basic'
import { perimeterToolGroup } from './perimeter'

// Export tool system components
export { ToolContextProvider } from './system/ToolContext'
export { MainToolbar } from '../toolbar/MainToolbar'
export { PropertiesPanel } from '../properties/PropertiesPanel'

// Export tool system types and hooks
export type { Tool, ToolGroup } from './system/types'
export {
  useToolManager,
  useToolManagerState,
  useActiveTool,
  useActiveToolId,
  useToolContext
} from './system/ToolContext'

// Export individual tool groups for external registration
export { basicToolGroup } from './basic'
export { perimeterToolGroup } from './perimeter'

/**
 * Register all available tools - simple and direct
 */
export function registerAllTools(manager: ToolManager): void {
  manager.registerToolGroup(basicToolGroup)
  manager.registerToolGroup(perimeterToolGroup)
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
