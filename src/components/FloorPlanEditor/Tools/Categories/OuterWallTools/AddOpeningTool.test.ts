import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddOpeningTool } from './AddOpeningTool'
import { createOuterWallToolGroup } from './index'
import { createLength } from '@/types/geometry'

describe('AddOpeningTool', () => {
  let addOpeningTool: AddOpeningTool

  beforeEach(() => {
    addOpeningTool = new AddOpeningTool()
  })

  it('should have correct tool properties', () => {
    expect(addOpeningTool.id).toBe('add-opening')
    expect(addOpeningTool.name).toBe('Add Opening')
    expect(addOpeningTool.icon).toBe('🚪')
    expect(addOpeningTool.hotkey).toBe('o')
    expect(addOpeningTool.cursor).toBe('crosshair')
    expect(addOpeningTool.category).toBe('outer-walls')
  })

  it('should initialize with default door configuration', () => {
    expect(addOpeningTool.state.openingType).toBe('door')
    expect(addOpeningTool.state.width).toBe(createLength(800))
    expect(addOpeningTool.state.height).toBe(createLength(2100))
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  it('should reset state on activation', () => {
    // Set some non-default state
    addOpeningTool.state.hoveredWallSegment = {} as any
    addOpeningTool.state.previewPosition = [100, 200] as any
    addOpeningTool.state.canPlace = true

    addOpeningTool.onActivate()

    expect(addOpeningTool.state.hoveredWallSegment).toBeUndefined()
    expect(addOpeningTool.state.previewPosition).toBeUndefined()
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  describe('configuration methods', () => {
    it('should update opening type and apply defaults', () => {
      addOpeningTool.setOpeningType('window')

      expect(addOpeningTool.state.openingType).toBe('window')
      expect(addOpeningTool.state.width).toBe(createLength(1200))
      expect(addOpeningTool.state.height).toBe(createLength(1200))
      expect(addOpeningTool.state.sillHeight).toBe(createLength(800))
    })

    it('should update width', () => {
      const newWidth = createLength(1000)
      addOpeningTool.setWidth(newWidth)

      expect(addOpeningTool.state.width).toBe(newWidth)
    })

    it('should update height', () => {
      const newHeight = createLength(2400)
      addOpeningTool.setHeight(newHeight)

      expect(addOpeningTool.state.height).toBe(newHeight)
    })

    it('should update sill height', () => {
      const newSillHeight = createLength(1000)
      addOpeningTool.setSillHeight(newSillHeight)

      expect(addOpeningTool.state.sillHeight).toBe(newSillHeight)
    })

    it('should clear sill height when set to undefined', () => {
      addOpeningTool.state.sillHeight = createLength(800)
      addOpeningTool.setSillHeight(undefined)

      expect(addOpeningTool.state.sillHeight).toBeUndefined()
    })
  })

  it('should register and unregister render listeners', () => {
    const mockListener = vi.fn()

    const unregister = addOpeningTool.onRenderNeeded(mockListener)

    // Trigger render
    addOpeningTool.setOpeningType('window')

    expect(mockListener).toHaveBeenCalled()

    // Unregister and trigger again
    mockListener.mockClear()
    unregister()
    addOpeningTool.setOpeningType('door')

    expect(mockListener).not.toHaveBeenCalled()
  })

  it('should be registered in outer wall tool group', () => {
    const outerWallToolGroup = createOuterWallToolGroup()

    expect(outerWallToolGroup.tools.find((tool: any) => tool.id === 'add-opening')).toBeInstanceOf(AddOpeningTool)
  })
})
