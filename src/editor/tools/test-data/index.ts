import type { ToolGroup } from '@/editor/tools/system/types'

import { TestDataTool } from './TestDataTool'

// Export individual tools
export { TestDataTool } from './TestDataTool'

// Create and export tool group
export const createTestDataToolGroup = (): ToolGroup => ({
  id: 'test-data',
  name: 'Test Data',
  icon: '🧪',
  category: 'development',
  tools: [new TestDataTool()],
  defaultTool: 'basic.test-data'
})

// Export as default tool group
export const testDataToolGroup = createTestDataToolGroup()
