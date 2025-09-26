import type { ToolGroup } from '@/editor/tools/system/types'

import { SelectTool } from './SelectTool'
import { FitToViewTool } from './fit-to-view/FitToViewTool'
import { MoveTool } from './movement/MoveTool'

// Export individual tools
export { SelectTool } from './SelectTool'
export { MoveTool } from './movement/MoveTool'
export { FitToViewTool } from './fit-to-view/FitToViewTool'

// Create and export tool group
export const createBasicToolGroup = (): ToolGroup => ({
  id: 'basic',
  name: 'Basic',
  icon: '↖',
  category: 'basic',
  tools: [new SelectTool(), new MoveTool(), new FitToViewTool()],
  defaultTool: 'basic.select'
})

// Export as default tool group
export const basicToolGroup = createBasicToolGroup()
