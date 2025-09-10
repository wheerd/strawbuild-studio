import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FitToViewTool } from './FitToViewTool'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import { createVec2 } from '@/types/geometry/basic'
import type { Perimeter } from '@/types/model'
import type { ToolContext } from '../../ToolSystem/types'
import type { FloorId } from '@/types/ids'

// Mock the store hooks
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore')
vi.mock('@/components/FloorPlanEditor/hooks/useViewportStore')
vi.mock('@/model/store')
vi.mock('../../ToolSystem/ToolManager')

describe('FitToViewTool', () => {
  let fitToViewTool: FitToViewTool
  let mockGetPerimetersByFloor: ReturnType<typeof vi.fn>
  let mockFitToView: ReturnType<typeof vi.fn>
  let mockContext: Pick<ToolContext, 'fitToView'>

  beforeEach(() => {
    fitToViewTool = new FitToViewTool()

    // Create only the specific mocks we need for these tests
    mockGetPerimetersByFloor = vi.fn()
    mockFitToView = vi.fn()
    mockContext = { fitToView: mockFitToView }

    // Mock editor store to return the active floor ID
    const mockedUseEditorStore = vi.mocked(useEditorStore)
    mockedUseEditorStore.getState = vi.fn(() => ({
      activeFloorId: 'floor1' as FloorId
    })) as any

    // Mock model store to return our mock function
    const mockedUseModelStore = vi.mocked(useModelStore)
    mockedUseModelStore.getState = vi.fn(() => ({
      getPerimetersByFloor: mockGetPerimetersByFloor
    })) as any
  })

  it('should have correct properties', () => {
    expect(fitToViewTool.name).toBe('Fit to View')
    expect(fitToViewTool.icon).toBe('⊞')
    expect(fitToViewTool.hotkey).toBe('f')
  })

  it('should perform fit to view and switch to select tool on activation', () => {
    const mockOuterWalls = [
      {
        boundary: [createVec2(-1000, -500), createVec2(1000, -500), createVec2(1000, 500), createVec2(-1000, 500)],
        corners: [
          { outsidePoint: createVec2(-1100, -600), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(1100, -600), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(1100, 600), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(-1100, 600), belongsTo: 'previous' as const }
        ]
      } as Perimeter
    ]

    mockGetPerimetersByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate(mockContext as ToolContext)

    // Should have called getPerimetersByFloor
    expect(mockGetPerimetersByFloor).toHaveBeenCalledWith('floor1')

    // Should have called fitToView on context
    expect(mockFitToView).toHaveBeenCalled()
  })

  it('should handle empty bounds gracefully', () => {
    mockGetPerimetersByFloor.mockReturnValue([])

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    fitToViewTool.onActivate(mockContext as ToolContext)

    expect(consoleSpy).toHaveBeenCalledWith('No entities to fit - no bounds available')
    expect(mockFitToView).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should calculate correct zoom and pan for given bounds', () => {
    const mockOuterWalls = [
      {
        boundary: [createVec2(0, 0), createVec2(2000, 0), createVec2(2000, 1000), createVec2(0, 1000)],
        corners: [
          { outsidePoint: createVec2(-100, -100), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(2100, -100), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(2100, 1100), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(-100, 1100), belongsTo: 'previous' as const }
        ]
      } as Perimeter
    ]

    mockGetPerimetersByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate(mockContext as ToolContext)

    // Should have called fitToView with the correct bounds
    // Bounds: min(-100, -100) to max(2100, 1100)
    expect(mockFitToView).toHaveBeenCalledWith(
      expect.objectContaining({
        min: expect.objectContaining({ 0: -100, 1: -100 }),
        max: expect.objectContaining({ 0: 2100, 1: 1100 })
      })
    )
  })

  it('should enforce minimum dimensions for small bounds', () => {
    const mockOuterWalls = [
      {
        boundary: [createVec2(100, 100), createVec2(110, 100), createVec2(110, 110), createVec2(100, 110)],
        corners: [
          { outsidePoint: createVec2(95, 95), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(115, 95), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(115, 115), belongsTo: 'previous' as const },
          { outsidePoint: createVec2(95, 115), belongsTo: 'previous' as const }
        ]
      } as Perimeter
    ]

    mockGetPerimetersByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate(mockContext as ToolContext)

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
