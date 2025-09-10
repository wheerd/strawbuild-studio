import type { ToolManager } from './ToolSystem/ToolManager'
import { basicToolGroup } from './Categories/BasicTools'
import { perimeterToolGroup } from './Categories/PerimeterTools'

// Export tool system components
export { ToolContextProvider } from './ToolSystem/ToolContext'
export { MainToolbar } from './Toolbar/MainToolbar'
export { PropertiesPanel } from './PropertiesPanel/PropertiesPanel'

// Export tool system types and hooks
export type { Tool, ToolGroup } from './ToolSystem/types'
export {
  useToolManager,
  useToolManagerState,
  useActiveTool,
  useActiveToolId,
  useToolContext
} from './ToolSystem/ToolContext'

// Export individual tool groups for external registration
export { basicToolGroup } from './Categories/BasicTools'
export { perimeterToolGroup } from './Categories/PerimeterTools'

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
