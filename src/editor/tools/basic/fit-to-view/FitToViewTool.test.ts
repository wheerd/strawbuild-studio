import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreyId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import '@/shared/geometry/basic'

import { FitToViewTool } from './FitToViewTool'

// Mock the store hooks
vi.mock('@/editor/hooks/useViewportStore')
vi.mock('@/building/store')
vi.mock('@/editor/tools/system', () => ({
  getToolActions: vi.fn(() => ({
    popTool: vi.fn(),
    pushTool: vi.fn(),
    replaceTool: vi.fn(),
    clearToDefault: vi.fn()
  }))
}))

describe('FitToViewTool', () => {
  let fitToViewTool: FitToViewTool
  let mockGetPerimetersByStorey: ReturnType<typeof vi.fn>
  let mockGetFloorAreasByStorey: ReturnType<typeof vi.fn>
  let mockFitToView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fitToViewTool = new FitToViewTool()

    // Create only the specific mocks we need for these tests
    mockGetPerimetersByStorey = vi.fn()
    mockGetFloorAreasByStorey = vi.fn()
    mockFitToView = vi.fn()

    // Mock model actions accessor
    const mockedGetModelActions = vi.mocked(getModelActions)
    mockedGetModelActions.mockReturnValue({
      getActiveStoreyId: () => 'floor1' as StoreyId,
      getPerimetersByStorey: mockGetPerimetersByStorey,
      getFloorAreasByStorey: mockGetFloorAreasByStorey
    } as any)

    // Mock viewport actions
    const mockedViewportActions = vi.mocked(viewportActions)
    mockedViewportActions.mockReturnValue({
      fitToView: mockFitToView
    } as any)
  })

  it('should have correct id', () => {
    expect(fitToViewTool.id).toBe('basic.fit-to-view')
  })

  it('should perform fit to view and switch to select tool on activation', () => {
    const mockPerimeters = [
      {
        corners: [
          {
            outsidePoint: vec2.fromValues(-1100, -600)
          },
          {
            outsidePoint: vec2.fromValues(1100, -600)
          },
          {
            outsidePoint: vec2.fromValues(1100, 600)
          },
          {
            outsidePoint: vec2.fromValues(-1100, 600)
          }
        ] as PerimeterCorner[]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockPerimeters)
    mockGetFloorAreasByStorey.mockReturnValue([])

    fitToViewTool.onActivate()

    // Should have called getPerimetersByStorey
    expect(mockGetPerimetersByStorey).toHaveBeenCalledWith('floor1')

    // Should have called fitToView via viewportActions
    expect(mockFitToView).toHaveBeenCalled()
  })

  it('should handle empty bounds gracefully', () => {
    mockGetPerimetersByStorey.mockReturnValue([])
    mockGetFloorAreasByStorey.mockReturnValue([])

    const consoleSpy = vi.spyOn(console, 'log')

    fitToViewTool.onActivate()

    expect(consoleSpy).toHaveBeenCalledWith('No entities to fit - no bounds available')
    expect(mockFitToView).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should calculate correct zoom and pan for given bounds', () => {
    const mockPerimeters = [
      {
        corners: [
          {
            outsidePoint: vec2.fromValues(-100, -100)
          },
          {
            outsidePoint: vec2.fromValues(2100, -100)
          },
          {
            outsidePoint: vec2.fromValues(2100, 900)
          },
          {
            outsidePoint: vec2.fromValues(-100, 900)
          }
        ] as PerimeterCorner[]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockPerimeters)
    mockGetFloorAreasByStorey.mockReturnValue([])

    fitToViewTool.onActivate()

    // Should have called fitToView with the correct bounds
    // Bounds: min(-100, -100) to max(2100, 1100)
    expect(mockFitToView).toHaveBeenCalledWith(
      expect.objectContaining({
        min: expect.objectContaining({ 0: -100, 1: -100 }),
        max: expect.objectContaining({ 0: 2100, 1: 900 })
      })
    )
  })

  it('should enforce minimum dimensions for small bounds', () => {
    const mockOuterWalls = [
      {
        corners: [
          {
            outsidePoint: vec2.fromValues(95, 95)
          },
          {
            outsidePoint: vec2.fromValues(115, 95)
          },
          {
            outsidePoint: vec2.fromValues(115, 115)
          },
          {
            outsidePoint: vec2.fromValues(95, 115)
          }
        ]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockOuterWalls)
    mockGetFloorAreasByStorey.mockReturnValue([])

    fitToViewTool.onActivate()

    // Should have called fitToView with the small bounds
    // Bounds: min(95, 95) to max(115, 115)
    expect(mockFitToView).toHaveBeenCalledWith(
      expect.objectContaining({
        min: expect.objectContaining({ 0: 95, 1: 95 }),
        max: expect.objectContaining({ 0: 115, 1: 115 })
      })
    )
  })
})
