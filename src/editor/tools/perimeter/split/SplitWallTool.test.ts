import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterWallWithGeometry } from '@/building/model'
import { createPerimeterCornerId, createPerimeterId, createPerimeterWallId } from '@/building/model/ids'
import { ZERO_VEC2, newVec2 } from '@/shared/geometry'

import { SplitWallTool } from './SplitWallTool'

// Simple mocks
vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getPerimeterById: vi.fn(),
    splitPerimeterWall: vi.fn()
  })
}))
vi.mock('@/editor/hooks/useSelectionStore', () => ({
  getCurrentSelection: vi.fn(),
  getSelectionActions: vi.fn(() => ({
    clearSelection: vi.fn()
  })),
  getSelectionPath: vi.fn(() => [])
}))
vi.mock('@/editor/services/length-input', () => ({
  activateLengthInput: vi.fn()
}))
vi.mock('@/editor/canvas/services/EntityHitTestService', () => ({
  entityHitTestService: {
    findEntityAt: vi.fn()
  }
}))
vi.mock('@/editor/tools/system', () => ({
  getToolActions: vi.fn(() => ({
    popTool: vi.fn(),
    pushTool: vi.fn(),
    replaceTool: vi.fn(),
    clearToDefault: vi.fn()
  }))
}))

describe('SplitWallTool', () => {
  let tool: SplitWallTool

  beforeEach(() => {
    tool = new SplitWallTool()
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    expect(tool.state.selectedWallId).toBeNull()
    expect(tool.state.targetPosition).toBeNull()
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toBeNull()
  })

  it('should set target wall and calculate middle position', () => {
    const perimeterId = createPerimeterId()
    const wallId = createPerimeterWallId()

    // Mock wall with 1000mm length
    const mockWall: PerimeterWallWithGeometry = {
      id: wallId,
      perimeterId,
      startCornerId: createPerimeterCornerId(),
      endCornerId: createPerimeterCornerId(),
      thickness: 420,
      wallAssemblyId: 'assembly1' as any,
      entityIds: [],
      insideLength: 1000,
      outsideLength: 1000,
      wallLength: 1000,
      insideLine: {
        start: ZERO_VEC2,
        end: newVec2(1000, 0)
      },
      outsideLine: {
        start: newVec2(0, 420),
        end: newVec2(1000, 420)
      },
      direction: newVec2(1, 0),
      outsideDirection: newVec2(0, 1)
    }

    // Manually set the state to test the logic
    tool.state.selectedWallId = wallId
    tool.state.wall = mockWall
    tool.updateTargetPosition(500)

    expect(tool.state.selectedWallId).toBe(wallId)
    expect(tool.state.targetPosition).toBe(500)
    expect(tool.state.isValidSplit).toBe(true)
  })

  it('should validate split positions correctly', () => {
    const wallId = createPerimeterWallId()

    const mockWall: PerimeterWallWithGeometry = {
      id: wallId,
      thickness: 420,
      wallAssemblyId: 'assembly1' as any,
      openings: [
        {
          id: 'opening1' as any,
          type: 'door',
          width: 800,
          height: 2000,
          centerOffsetFromWallStart: 600, // Center at 600mm, spans 200mm to 1000mm
          sillHeight: 0
        }
      ],
      posts: [],
      insideLength: 2000,
      outsideLength: 2000,
      wallLength: 2000,
      insideLine: {
        start: ZERO_VEC2,
        end: newVec2(2000, 0)
      },
      outsideLine: {
        start: newVec2(0, 420),
        end: newVec2(2000, 420)
      },
      direction: newVec2(1, 0),
      outsideDirection: newVec2(0, 1)
    }

    // Manually set the state to test validation logic
    tool.state.selectedWallId = wallId
    tool.state.wall = mockWall

    // Test valid position (before opening)
    tool.updateTargetPosition(100)
    expect(tool.state.isValidSplit).toBe(true)
    expect(tool.state.splitError).toBeNull()

    // Test invalid position (inside opening: 200-1000mm)
    tool.updateTargetPosition(500)
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toBe('intersectsOpening')

    // Test valid position (after opening)
    tool.updateTargetPosition(1500)
    expect(tool.state.isValidSplit).toBe(true)
    expect(tool.state.splitError).toBeNull()

    // Test invalid positions at boundaries
    tool.updateTargetPosition(0)
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toBe('outOfBounds')

    tool.updateTargetPosition(2000)
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toBe('outOfBounds')
  })

  it('should have proper tool metadata', () => {
    expect(tool.id).toBe('perimeter.split-wall')
    expect(tool.overlayComponent).toBeDefined()
    expect(tool.inspectorComponent).toBeDefined()
  })
})
