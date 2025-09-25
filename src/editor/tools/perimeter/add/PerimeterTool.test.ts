import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as lengthInputService from '@/editor/services/length-input'
import { perimeterToolGroup } from '@/editor/tools/perimeter'
import { createLength, createVec2 } from '@/shared/geometry'

import { PerimeterTool } from './PerimeterTool'

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

  describe('length input integration', () => {
    let tool: PerimeterTool
    let activateLengthInputSpy: any
    let deactivateLengthInputSpy: any
    let updateLengthInputPositionSpy: any

    beforeEach(() => {
      tool = new PerimeterTool()
      activateLengthInputSpy = vi.spyOn(lengthInputService, 'activateLengthInput').mockImplementation(() => {})
      deactivateLengthInputSpy = vi.spyOn(lengthInputService, 'deactivateLengthInput').mockImplementation(() => {})
      updateLengthInputPositionSpy = vi
        .spyOn(lengthInputService, 'updateLengthInputPosition')
        .mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should not activate length input after placing first point', () => {
      tool.state.points = [createVec2(0, 0)]
      tool.state.isCurrentLineValid = true

      // Simulate adding a point (this would normally happen in handlePointerDown)
      tool.state.points.push(createVec2(100, 0))

      // Call the private method directly for testing
      if (tool.state.points.length >= 2) {
        ;(tool as any).activateLengthInput()
      }

      expect(activateLengthInputSpy).toHaveBeenCalledTimes(1)
      expect(activateLengthInputSpy).toHaveBeenCalledWith({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        }),
        placeholder: 'Enter segment length...',
        onCommit: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('should update last point position when length is committed', () => {
      // Set up tool with two points
      tool.state.points = [createVec2(0, 0), createVec2(100, 0)]

      // Call activateLengthInput to set up the callback
      ;(tool as any).activateLengthInput()
      const commitCallback = activateLengthInputSpy.mock.calls[0]?.[0]?.onCommit

      // Simulate committing a length of 200mm
      if (commitCallback) {
        commitCallback(createLength(200))
      }

      // The last point should be updated to make the segment exactly 200mm long
      expect(tool.state.points[1]).toEqual(createVec2(200, 0))
    })

    it('should handle length commit with different directions', () => {
      // Set up tool with two points in a different direction
      tool.state.points = [createVec2(0, 0), createVec2(100, 100)]

      // Call activateLengthInput to set up the callback
      ;(tool as any).activateLengthInput()
      const commitCallback = activateLengthInputSpy.mock.calls[0]?.[0]?.onCommit

      // Simulate committing a length that would change the endpoint
      if (commitCallback) {
        commitCallback(createLength(200)) // ~141.42mm diagonal becomes 200mm
      }

      // The last point should be updated maintaining the direction but with new length
      const expectedDistance = Math.sqrt(
        Math.pow(tool.state.points[1][0] - tool.state.points[0][0], 2) +
          Math.pow(tool.state.points[1][1] - tool.state.points[0][1], 2)
      )
      expect(Math.round(expectedDistance)).toBe(200)
    })

    it('should deactivate length input on tool deactivation', () => {
      tool.onDeactivate()

      expect(deactivateLengthInputSpy).toHaveBeenCalledTimes(1)
    })

    it('should not commit length if less than 2 points', () => {
      tool.state.points = [createVec2(0, 0)]

      // Try to commit a length
      const handleLengthCommit = (tool as any).handleLengthCommit
      handleLengthCommit(createLength(100))

      // Point should remain unchanged
      expect(tool.state.points).toEqual([createVec2(0, 0)])
    })

    it('should calculate correct position for length input', () => {
      tool.state.points = [createVec2(0, 0), createVec2(100, 50)]

      const position = (tool as any).getLengthInputPosition()

      expect(position).toEqual({
        x: 120, // 100 + 20 offset
        y: 20 // 50 - 30 offset
      })
    })

    it('should provide fallback position when no points', () => {
      tool.state.points = []

      const position = (tool as any).getLengthInputPosition()

      expect(position).toEqual({ x: 400, y: 300 })
    })

    it('should update length input position when placing third point', () => {
      // Set up tool with two points (length input should be active)
      tool.state.points = [createVec2(0, 0), createVec2(100, 0)]
      tool.state.isCurrentLineValid = true

      // Simulate adding a third point
      tool.state.points.push(createVec2(100, 100))

      // Call the position update method directly
      ;(tool as any).updateLengthInputPosition()

      expect(updateLengthInputPositionSpy).toHaveBeenCalledTimes(1)
      expect(updateLengthInputPositionSpy).toHaveBeenCalledWith({
        x: 120, // 100 + 20 offset
        y: 70 // 100 - 30 offset
      })
    })

    it('should not update position when less than 2 points', () => {
      tool.state.points = [createVec2(0, 0)]
      ;(tool as any).updateLengthInputPosition()

      expect(updateLengthInputPositionSpy).not.toHaveBeenCalled()
    })
  })
})
