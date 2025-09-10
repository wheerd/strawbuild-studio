import { describe, it, expect, beforeEach } from 'vitest'
import { ToolManager } from './ToolSystem/ToolManager'
import { registerAllTools } from './index'
import { PerimeterTool } from './Categories/OuterWallTools/PerimeterTool'

describe('Tool Integration', () => {
  let toolManager: ToolManager

  beforeEach(() => {
    toolManager = new ToolManager()
    registerAllTools(toolManager)
  })

  it('should register outer wall polygon tool', () => {
    const tool = toolManager.getTool('perimeter-polygon')
    expect(tool).toBeInstanceOf(PerimeterTool)
  })

  it('should be able to activate outer wall polygon tool', () => {
    const success = toolManager.activateTool('perimeter-polygon')
    expect(success).toBe(true)
    expect(toolManager.getActiveTool()?.id).toBe('perimeter-polygon')
  })

  it('should have outer walls tool group registered', () => {
    const wallsGroup = toolManager.getToolGroup('walls')

    expect(wallsGroup).toBeDefined()
    expect(wallsGroup?.name).toBe('Outer Walls')
    expect(wallsGroup?.tools).toHaveLength(2)
  })
})
