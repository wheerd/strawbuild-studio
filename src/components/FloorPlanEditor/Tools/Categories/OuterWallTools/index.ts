import type { ToolGroup } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { PerimeterTool } from './PerimeterTool'
import { AddOpeningTool } from './AddOpeningTool'

// Export individual tools
export { PerimeterTool } from './PerimeterTool'
export { AddOpeningTool } from './AddOpeningTool'

// Create and export tool group
export const createOuterWallToolGroup = (): ToolGroup => ({
  id: 'walls',
  name: 'Outer Walls',
  icon: '⬜',
  category: 'walls',
  tools: [new PerimeterTool(), new AddOpeningTool()],
  defaultTool: 'perimeter-polygon'
})

// Export as default tool group
export const outerWallToolGroup = createOuterWallToolGroup()
