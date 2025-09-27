import { describe, expect, it } from 'vitest'

import { PerimeterTool } from './perimeter/add/PerimeterTool'
import { TOOL_DEFINITIONS, TOOL_GROUPS, getToolById } from './store/toolDefinitions'

describe('Tool Integration', () => {
  it('should have perimeter add tool in definitions', () => {
    const tool = getToolById('perimeter.add')
    expect(tool).toBeInstanceOf(PerimeterTool)
  })

  it('should be able to get perimeter add tool by id', () => {
    const tool = TOOL_DEFINITIONS['perimeter.add']
    expect(tool).toBeInstanceOf(PerimeterTool)
    expect(tool.id).toBe('perimeter.add')
  })

  it('should have perimeter tool group with correct tools', () => {
    const perimeterGroup = TOOL_GROUPS.find(group => group.name === 'Perimeter')

    expect(perimeterGroup).toBeDefined()
    expect(perimeterGroup?.name).toBe('Perimeter')
    expect(perimeterGroup?.tools).toHaveLength(3)
    expect(perimeterGroup?.tools).toContain('perimeter.add')
    expect(perimeterGroup?.tools).toContain('perimeter.preset')
    expect(perimeterGroup?.tools).toContain('perimeter.add-opening')
  })
})
