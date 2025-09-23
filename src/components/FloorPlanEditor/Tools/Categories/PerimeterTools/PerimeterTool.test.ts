import { describe, it, expect } from 'vitest'
import { PerimeterTool } from './PerimeterTool'
import { perimeterToolGroup } from './index'

describe('PerimeterTool', () => {
  it('should have correct tool properties', () => {
    const tool = new PerimeterTool()

    expect(tool.id).toBe('perimeter')
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

  it('should be registered in perimeter tool group', () => {
    expect(perimeterToolGroup.id).toBe('perimeters')
    expect(perimeterToolGroup.name).toBe('Perimeter Walls')
    expect(perimeterToolGroup.tools).toHaveLength(3)
    expect(perimeterToolGroup.tools.find(tool => tool.id === 'perimeter')).toBeInstanceOf(PerimeterTool)
    expect(perimeterToolGroup.defaultTool).toBe('perimeter')
  })
})
