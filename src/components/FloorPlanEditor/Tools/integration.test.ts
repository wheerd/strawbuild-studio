import { describe, it, expect, beforeEach } from 'vitest'
import { ToolManager } from './ToolSystem/ToolManager'
import { registerAllTools } from './index'
import { PerimeterTool } from './Categories/PerimeterTools/PerimeterTool'

describe('Tool Integration', () => {
  let toolManager: ToolManager

  beforeEach(() => {
    toolManager = new ToolManager()
    registerAllTools(toolManager)
  })

  it('should register perimeter polygon tool', () => {
    const tool = toolManager.getTool('perimeter')
    expect(tool).toBeInstanceOf(PerimeterTool)
  })

  it('should be able to activate perimeter polygon tool', () => {
    const success = toolManager.activateTool('perimeter')
    expect(success).toBe(true)
    expect(toolManager.getActiveTool()?.id).toBe('perimeter')
  })

  it('should have perimeters tool group registered', () => {
    const wallsGroup = toolManager.getToolGroup('perimeters')

    expect(wallsGroup).toBeDefined()
    expect(wallsGroup?.name).toBe('Perimeter Walls')
    expect(wallsGroup?.tools).toHaveLength(3)
  })
})
