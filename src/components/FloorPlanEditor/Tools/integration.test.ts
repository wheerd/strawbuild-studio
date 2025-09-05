import { describe, it, expect, beforeEach } from 'vitest'
import { ToolManager } from './ToolSystem/ToolManager'
import { registerAllTools } from './index'
import { OuterWallPolygonTool } from './Categories/OuterWallTools/OuterWallPolygonTool'

describe('Tool Integration', () => {
  let toolManager: ToolManager

  beforeEach(() => {
    toolManager = new ToolManager()
    registerAllTools(toolManager)
  })

  it('should register outer wall polygon tool', () => {
    const tool = toolManager.getTool('outer-wall-polygon')
    expect(tool).toBeInstanceOf(OuterWallPolygonTool)
  })

  it('should be able to activate outer wall polygon tool', () => {
    const success = toolManager.activateTool('outer-wall-polygon')
    expect(success).toBe(true)
    expect(toolManager.getActiveTool()?.id).toBe('outer-wall-polygon')
  })

  it('should have outer walls tool group registered', () => {
    const outerWallGroup = toolManager.getToolGroup('outer-walls')

    expect(outerWallGroup).toBeDefined()
    expect(outerWallGroup?.name).toBe('Outer Walls')
    expect(outerWallGroup?.tools).toHaveLength(2)
  })
})
