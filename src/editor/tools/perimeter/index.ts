import type { ToolGroup } from '@/editor/tools/system/types'

import { AddOpeningTool } from './add-opening/AddOpeningTool'
import { PerimeterTool } from './add/PerimeterTool'
import { PerimeterPresetTool } from './preset/PerimeterPresetTool'

// Export individual tools
export { PerimeterTool } from './add/PerimeterTool'
export { AddOpeningTool } from './add-opening/AddOpeningTool'
export { PerimeterPresetTool } from './preset/PerimeterPresetTool'

// Create and export tool group
export const createPerimeterToolGroup = (): ToolGroup => ({
  id: 'perimeters',
  name: 'Perimeter Walls',
  icon: '⬜',
  category: 'perimeters',
  tools: [new PerimeterTool(), new PerimeterPresetTool(), new AddOpeningTool()],
  defaultTool: 'perimeter.add'
})

// Export as default tool group
export const perimeterToolGroup = createPerimeterToolGroup()
