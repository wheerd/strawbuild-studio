import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as useViewportStore from '@/editor/hooks/useViewportStore'
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
    beforeEach(() => {
      tool = new PerimeterTool()
      activateLengthInputSpy = vi.spyOn(lengthInputService, 'activateLengthInput').mockImplementation(vi.fn())
      deactivateLengthInputSpy = vi.spyOn(lengthInputService, 'deactivateLengthInput').mockImplementation(vi.fn())

      // Mock viewport transformations
      vi.spyOn(useViewportStore, 'viewportActions').mockReturnValue({
        worldToStage: vi.fn(worldPos => ({
          x: worldPos[0] + 50, // Simple linear transformation for testing
          y: worldPos[1] + 100
        })),
        stageToWorld: vi.fn(),
        setViewport: vi.fn(),
        setStageDimensions: vi.fn(),
        setZoom: vi.fn(),
        setPan: vi.fn(),
        zoomBy: vi.fn(),
        panBy: vi.fn(),
        fitToView: vi.fn(),
        reset: vi.fn()
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should activate length input for next segment after placing second point', () => {
      tool.state.points = [createVec2(0, 0), createVec2(100, 0)]

      // Call the private method directly for testing
      ;(tool as any).activateLengthInputForNextSegment()

      expect(activateLengthInputSpy).toHaveBeenCalledTimes(1)
      expect(activateLengthInputSpy).toHaveBeenCalledWith({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number)
        }),
        placeholder: 'Enter length...',
        onCommit: expect.any(Function),
        onCancel: expect.any(Function)
      })
    })

    it('should set length override when length is committed', () => {
      // Set up tool with two points
      tool.state.points = [createVec2(0, 0), createVec2(100, 0)]

      // Call activateLengthInputForNextSegment to set up the callback
      ;(tool as any).activateLengthInputForNextSegment()
      const commitCallback = activateLengthInputSpy.mock.calls[0]?.[0]?.onCommit

      // Simulate committing a length of 200mm
      if (commitCallback) {
        commitCallback(createLength(200))
      }

      // Check that the length override was set
      expect(tool.state.lengthOverride).toEqual(createLength(200))
    })

    it('should clear length override when escape is pressed', () => {
      // Set up tool with length override
      tool.state.points = [createVec2(0, 0), createVec2(100, 0)]
      tool.state.lengthOverride = createLength(100)

      // Create mock keyboard event
      const mockKeyboardEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      const mockCanvasEvent = {
        originalEvent: mockKeyboardEvent,
        stageCoordinates: createVec2(0, 0),
        context: {} as any
      }

      // Call handleKeyDown directly
      const result = tool.handleKeyDown(mockCanvasEvent)

      // Should return true (handled) and clear the override
      expect(result).toBe(true)
      expect(tool.state.lengthOverride).toBeNull()
    })

    it('should deactivate length input on tool deactivation', () => {
      tool.onDeactivate()

      expect(deactivateLengthInputSpy).toHaveBeenCalledTimes(1)
    })

    it('should not activate length input if no points', () => {
      tool.state.points = []

      // Try to activate length input
      ;(tool as any).activateLengthInputForNextSegment()

      // Should not have been called since no points exist
      expect(activateLengthInputSpy).not.toHaveBeenCalled()
    })

    it('should calculate position based on last placed point', () => {
      tool.state.points = [createVec2(0, 0), createVec2(100, 50)]

      const position = (tool as any).getLengthInputPosition()

      expect(position).toEqual({
        x: 170, // 100 + 50 (mock transform) + 20 (offset)
        y: 120 // 50 + 100 (mock transform) - 30 (offset)
      })
    })

    it('should provide fallback position when no points', () => {
      tool.state.points = []

      const position = (tool as any).getLengthInputPosition()

      expect(position).toEqual({ x: 400, y: 300 })
    })

    it('should have length override initially null', () => {
      expect(tool.state.lengthOverride).toBeNull()
    })

    it('should set and clear length override', () => {
      const testLength = createLength(1000)
      tool.setLengthOverride(testLength)
      expect(tool.state.lengthOverride).toBe(testLength)

      tool.clearLengthOverride()
      expect(tool.state.lengthOverride).toBeNull()
    })
  })
})
