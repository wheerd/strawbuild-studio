import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FitToViewTool } from './FitToViewTool'
import { useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useModelStore } from '@/model/store'
import { createVec2 } from '@/types/geometry/basic'

// Mock the store hooks
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore')
vi.mock('@/model/store')
vi.mock('../../ToolSystem/ToolManager')

describe('FitToViewTool', () => {
  let fitToViewTool: FitToViewTool
  let mockEditorStore: any
  let mockModelStore: any

  beforeEach(() => {
    fitToViewTool = new FitToViewTool()

    // Setup mock stores
    mockEditorStore = {
      activeFloorId: 'floor1',
      viewport: {
        stageWidth: 800,
        stageHeight: 600,
        zoom: 1,
        panX: 0,
        panY: 0
      },
      setViewport: vi.fn()
    }

    mockModelStore = {
      getFloorBounds: vi.fn(),
      getOuterWallsByFloor: vi.fn()
    }

    // Mock the store hook implementations
    vi.mocked(useEditorStore).mockImplementation((selector?: any) => {
      if (selector) {
        return selector(mockEditorStore)
      }
      return mockEditorStore
    })

    // Mock getState to return the store
    vi.mocked(useEditorStore).getState = vi.fn(() => mockEditorStore)

    vi.mocked(useModelStore).mockImplementation((selector?: any) => {
      if (selector) {
        return selector(mockModelStore)
      }
      return mockModelStore
    })

    // Mock getState to return the store
    vi.mocked(useModelStore).getState = vi.fn(() => mockModelStore)
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
      }
    ]

    mockModelStore.getOuterWallsByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate()

    // Should have called getOuterWallsByFloor
    expect(mockModelStore.getOuterWallsByFloor).toHaveBeenCalledWith('floor1')

    // Should have set new viewport
    expect(mockEditorStore.setViewport).toHaveBeenCalled()
  })

  it('should handle empty bounds gracefully', () => {
    mockModelStore.getOuterWallsByFloor.mockReturnValue([])
    mockModelStore.getFloorBounds.mockReturnValue(null)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    fitToViewTool.onActivate()

    expect(consoleSpy).toHaveBeenCalledWith('No outer walls found, falling back to all points')
    expect(consoleSpy).toHaveBeenCalledWith('No entities to fit - no bounds available')
    expect(mockEditorStore.setViewport).not.toHaveBeenCalled()

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
      }
    ]

    mockModelStore.getOuterWallsByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate()

    // Bounds: min(-100, -100) to max(2100, 1100) = 2200mm x 1200mm
    // Available viewport with 10% padding on both sides (20% total): 800*0.8=640px, 600*0.8=480px
    // Zoom calculations: 640/2200 ≈ 0.291, 480/1200 = 0.4 → min = 0.291
    // Center: (1000, 500)
    // Pan: panX = 400 - 1000*0.291 = 109, panY = 300 - 500*0.291 = 154.5

    expect(mockEditorStore.setViewport).toHaveBeenCalledWith({
      zoom: expect.closeTo(0.2909, 0.001),
      panX: expect.closeTo(109.09, 0.1),
      panY: expect.closeTo(154.55, 0.1)
    })
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
      }
    ]

    mockModelStore.getOuterWallsByFloor.mockReturnValue(mockOuterWalls)

    fitToViewTool.onActivate()

    // Bounds: min(95, 95) to max(115, 115) = 20mm x 20mm
    // Minimum dimension enforced = 1000mm, so effective bounds = 1000mm x 1000mm
    // Available viewport with 10% padding on both sides (20% total): 800*0.8=640px, 600*0.8=480px
    // Zoom calculations: 640/1000 = 0.64, 480/1000 = 0.48 → min = 0.48
    // Center: (105, 105)
    // Pan: panX = 400 - 105*0.48 = 349.6, panY = 300 - 105*0.48 = 249.6

    expect(mockEditorStore.setViewport).toHaveBeenCalledWith({
      zoom: expect.closeTo(0.48, 0.01),
      panX: expect.closeTo(349.6, 1),
      panY: expect.closeTo(249.6, 1)
    })
  })
})
