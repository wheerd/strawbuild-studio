import { describe, it, expect } from 'vitest'
import { PerimeterTool } from './PerimeterTool'
import { outerWallToolGroup } from './index'

describe('PerimeterTool', () => {
  it('should have correct tool properties', () => {
    const tool = new PerimeterTool()

    expect(tool.id).toBe('perimeter-polygon')
    expect(tool.name).toBe('Building Perimeter')
    expect(tool.icon).toBe('⬜')
    expect(tool.cursor).toBe('crosshair')
    expect(tool.category).toBe('walls')
  })

  it('should initialize with empty state', () => {
    const tool = new PerimeterTool()

    expect(tool.state.points).toEqual([])
  })

  it('should reset state on activation', () => {
    const tool = new PerimeterTool()
    tool.state.points = [{ x: 100, y: 100 } as any]

    tool.onActivate()

    expect(tool.state.points).toEqual([])
  })

  it('should be registered in outer wall tool group', () => {
    expect(outerWallToolGroup.id).toBe('walls')
    expect(outerWallToolGroup.name).toBe('Outer Walls')
    expect(outerWallToolGroup.tools).toHaveLength(2)
    expect(outerWallToolGroup.tools.find(tool => tool.id === 'perimeter-polygon')).toBeInstanceOf(PerimeterTool)
    expect(outerWallToolGroup.defaultTool).toBe('perimeter-polygon')
  })
})
