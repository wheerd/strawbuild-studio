import { describe, it, expect } from 'vitest'
import { OuterWallPolygonTool } from './OuterWallPolygonTool'
import { outerWallToolGroup } from './index'

describe('OuterWallPolygonTool', () => {
  it('should have correct tool properties', () => {
    const tool = new OuterWallPolygonTool()

    expect(tool.id).toBe('outer-wall-polygon')
    expect(tool.name).toBe('Outer Wall Polygon')
    expect(tool.icon).toBe('⬜')
    expect(tool.cursor).toBe('crosshair')
    expect(tool.category).toBe('walls')
  })

  it('should initialize with empty state', () => {
    const tool = new OuterWallPolygonTool()

    expect(tool.state.points).toEqual([])
  })

  it('should reset state on activation', () => {
    const tool = new OuterWallPolygonTool()
    tool.state.points = [{ x: 100, y: 100 } as any]

    tool.onActivate()

    expect(tool.state.points).toEqual([])
  })

  it('should be registered in outer wall tool group', () => {
    expect(outerWallToolGroup.id).toBe('outer-walls')
    expect(outerWallToolGroup.name).toBe('Outer Walls')
    expect(outerWallToolGroup.tools).toHaveLength(2)
    expect(outerWallToolGroup.tools.find(tool => tool.id === 'outer-wall-polygon')).toBeInstanceOf(OuterWallPolygonTool)
    expect(outerWallToolGroup.defaultTool).toBe('outer-wall-polygon')
  })
})
