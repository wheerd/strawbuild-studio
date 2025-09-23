import type { ToolGroup } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import { PerimeterTool } from './PerimeterTool'
import { AddOpeningTool } from './AddOpeningTool'
import { PerimeterPresetTool } from './PerimeterPresetTool'

// Export individual tools
export { PerimeterTool } from './PerimeterTool'
export { AddOpeningTool } from './AddOpeningTool'
export { PerimeterPresetTool } from './PerimeterPresetTool'

// Create and export tool group
export const createPerimeterToolGroup = (): ToolGroup => ({
  id: 'perimeters',
  name: 'Perimeter Walls',
  icon: '⬜',
  category: 'perimeters',
  tools: [new PerimeterTool(), new PerimeterPresetTool(), new AddOpeningTool()],
  defaultTool: 'perimeter'
})

// Export as default tool group
export const perimeterToolGroup = createPerimeterToolGroup()
