import type { ToolGroup } from '@/editor/tools/system/types'
import { SelectTool } from './SelectTool'
import { MoveTool } from './movement/MoveTool'
import { RotateTool } from './RotateTool'
import { TestDataTool } from './TestDataTool'
import { FitToViewTool } from './fit-to-view/FitToViewTool'

// Export individual tools
export { SelectTool } from './SelectTool'
export { MoveTool } from './movement/MoveTool'
export { RotateTool } from './RotateTool'
export type { RotateToolState } from './RotateTool'
export { TestDataTool } from './TestDataTool'
export { FitToViewTool } from './fit-to-view/FitToViewTool'

// Create and export tool group
export const createBasicToolGroup = (): ToolGroup => ({
  id: 'basic',
  name: 'Basic',
  icon: '↖',
  category: 'basic',
  tools: [new SelectTool(), new MoveTool(), new RotateTool(), new FitToViewTool(), new TestDataTool()],
  defaultTool: 'basic.select'
})

// Export as default tool group
export const basicToolGroup = createBasicToolGroup()
