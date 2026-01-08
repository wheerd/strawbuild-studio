import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterCornerWithGeometry } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/hooks/useViewportStore'
import { newVec2 } from '@/shared/geometry'

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
  let mockGetRoofsByStorey: ReturnType<typeof vi.fn>
  let mockFitToView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fitToViewTool = new FitToViewTool()

    // Create only the specific mocks we need for these tests
    mockGetPerimetersByStorey = vi.fn()
    mockGetFloorAreasByStorey = vi.fn()
    mockGetRoofsByStorey = vi.fn()
    mockFitToView = vi.fn()

    // Mock model actions accessor
    const mockedGetModelActions = vi.mocked(getModelActions)
    mockedGetModelActions.mockReturnValue({
      getActiveStoreyId: () => 'floor1' as StoreyId,
      getPerimetersByStorey: mockGetPerimetersByStorey,
      getFloorAreasByStorey: mockGetFloorAreasByStorey,
      getRoofsByStorey: mockGetRoofsByStorey
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
            outsidePoint: newVec2(-1100, -600)
          },
          {
            outsidePoint: newVec2(1100, -600)
          },
          {
            outsidePoint: newVec2(1100, 600)
          },
          {
            outsidePoint: newVec2(-1100, 600)
          }
        ] as PerimeterCornerWithGeometry[]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockPerimeters)
    mockGetFloorAreasByStorey.mockReturnValue([])
    mockGetRoofsByStorey.mockReturnValue([])

    fitToViewTool.onActivate()

    // Should have called getPerimetersByStorey
    expect(mockGetPerimetersByStorey).toHaveBeenCalledWith('floor1')
    expect(mockGetFloorAreasByStorey).toHaveBeenCalledWith('floor1')
    expect(mockGetRoofsByStorey).toHaveBeenCalledWith('floor1')

    // Should have called fitToView via viewportActions
    expect(mockFitToView).toHaveBeenCalled()
  })

  it('should handle empty bounds gracefully', () => {
    mockGetPerimetersByStorey.mockReturnValue([])
    mockGetFloorAreasByStorey.mockReturnValue([])
    mockGetRoofsByStorey.mockReturnValue([])

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
            outsidePoint: newVec2(-100, -100)
          },
          {
            outsidePoint: newVec2(2100, -100)
          },
          {
            outsidePoint: newVec2(2100, 900)
          },
          {
            outsidePoint: newVec2(-100, 900)
          }
        ] as PerimeterCornerWithGeometry[]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockPerimeters)
    mockGetFloorAreasByStorey.mockReturnValue([])
    mockGetRoofsByStorey.mockReturnValue([])

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
            outsidePoint: newVec2(95, 95)
          },
          {
            outsidePoint: newVec2(115, 95)
          },
          {
            outsidePoint: newVec2(115, 115)
          },
          {
            outsidePoint: newVec2(95, 115)
          }
        ]
      } as Perimeter
    ]

    mockGetPerimetersByStorey.mockReturnValue(mockOuterWalls)
    mockGetFloorAreasByStorey.mockReturnValue([])
    mockGetRoofsByStorey.mockReturnValue([])

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
