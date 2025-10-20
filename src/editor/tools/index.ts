import { SelectTool } from './basic/SelectTool'
import { FitToViewTool } from './basic/fit-to-view/FitToViewTool'
import { MoveTool } from './basic/movement/MoveTool'
import { FloorAreaTool } from './floors/add-area/FloorAreaTool'
import { FloorOpeningTool } from './floors/add-opening/FloorOpeningTool'
import { AddOpeningTool } from './perimeter/add-opening/AddOpeningTool'
import { PerimeterTool } from './perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from './perimeter/preset/PerimeterPresetTool'
import { SplitWallTool } from './perimeter/split/SplitWallTool'
import type { ToolId, ToolImplementation } from './system/types'
import { TestDataTool } from './test-data/TestDataTool'

export { MainToolbar } from '@/editor/MainToolbar'
export { SidePanel } from '@/editor/SidePanel'

export * from './system'

const TOOL_IMPLEMENTATIONS: Record<ToolId, ToolImplementation> = {
  'basic.select': new SelectTool(),
  'basic.move': new MoveTool(),
  'basic.fit-to-view': new FitToViewTool(),
  'floors.add-area': new FloorAreaTool(),
  'floors.add-opening': new FloorOpeningTool(),
  'perimeter.add': new PerimeterTool(),
  'perimeter.preset': new PerimeterPresetTool(),
  'perimeter.add-opening': new AddOpeningTool(),
  'perimeter.split-wall': new SplitWallTool(),
  'test.data': new TestDataTool()
}

export function getToolById(toolId: ToolId): ToolImplementation {
  return TOOL_IMPLEMENTATIONS[toolId]
}

export function getAllTools(): ToolImplementation[] {
  return Object.values(TOOL_IMPLEMENTATIONS)
}
