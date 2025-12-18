import { beforeEach, describe, expect, it, vi } from 'vitest'

import { newVec2 } from '@/shared/geometry'

import { AddOpeningTool } from './AddOpeningTool'

describe('AddOpeningTool', () => {
  let addOpeningTool: AddOpeningTool

  beforeEach(() => {
    addOpeningTool = new AddOpeningTool()
  })

  it('should have correct id', () => {
    expect(addOpeningTool.id).toBe('perimeter.add-opening')
  })

  it('should initialize with default door configuration', () => {
    expect(addOpeningTool.state.openingType).toBe('door')
    expect(addOpeningTool.state.width).toBe(800)
    expect(addOpeningTool.state.height).toBe(2100)
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  it('should reset state on activation', () => {
    // Set some non-default state
    addOpeningTool.state.hoveredPerimeterWall = {} as any
    addOpeningTool.state.previewPosition = newVec2(100, 200)
    addOpeningTool.state.canPlace = true

    addOpeningTool.onActivate()

    expect(addOpeningTool.state.hoveredPerimeterWall).toBeUndefined()
    expect(addOpeningTool.state.previewPosition).toBeUndefined()
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  describe('configuration methods', () => {
    it('should update opening type and apply defaults', () => {
      addOpeningTool.setOpeningType('window')

      expect(addOpeningTool.state.openingType).toBe('window')
      expect(addOpeningTool.state.width).toBe(1200)
      expect(addOpeningTool.state.height).toBe(1200)
      expect(addOpeningTool.state.sillHeight).toBe(800)
    })

    it('should update width', () => {
      const newWidth = 1000
      addOpeningTool.setWidth(newWidth)

      expect(addOpeningTool.state.width).toBe(newWidth)
    })

    it('should update height', () => {
      const newHeight = 2400
      addOpeningTool.setHeight(newHeight)

      expect(addOpeningTool.state.height).toBe(newHeight)
    })

    it('should update sill height', () => {
      const newSillHeight = 1000
      addOpeningTool.setSillHeight(newSillHeight)

      expect(addOpeningTool.state.sillHeight).toBe(newSillHeight)
    })

    it('should clear sill height when set to undefined', () => {
      addOpeningTool.state.sillHeight = 800
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

    // Unregister
    unregister()

    // Clear call history
    mockListener.mockClear()

    // Trigger render again
    addOpeningTool.setOpeningType('door')

    expect(mockListener).not.toHaveBeenCalled()
  })
})
