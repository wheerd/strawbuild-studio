import { SelectTool } from './basic/SelectTool'
import { FitToViewTool } from './basic/fit-to-view/FitToViewTool'
import { MoveTool } from './basic/movement/MoveTool'
import { AddOpeningTool } from './perimeter/add-opening/AddOpeningTool'
import { PerimeterTool } from './perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from './perimeter/preset/PerimeterPresetTool'
import type { ToolId, ToolImplementation } from './system/types'
import { ResetTool } from './test-data/ResetTool'
import { TestDataTool } from './test-data/TestDataTool'

export { MainToolbar } from '@/editor/toolbar/MainToolbar'
export { PropertiesPanel } from '@/editor/properties/PropertiesPanel'

export * from './system'

const TOOL_IMPLEMENTATIONS: Record<ToolId, ToolImplementation> = {
  'basic.select': new SelectTool(),
  'basic.move': new MoveTool(),
  'basic.fit-to-view': new FitToViewTool(),
  'perimeter.add': new PerimeterTool(),
  'perimeter.preset': new PerimeterPresetTool(),
  'perimeter.add-opening': new AddOpeningTool(),
  'test.data': new TestDataTool(),
  'test.reset': new ResetTool()
}

export function getToolById(toolId: ToolId): ToolImplementation {
  return TOOL_IMPLEMENTATIONS[toolId]
}

export function getAllTools(): ToolImplementation[] {
  return Object.values(TOOL_IMPLEMENTATIONS)
}
