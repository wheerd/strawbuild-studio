import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPerimeterId, createPerimeterWallId } from '@/building/model/ids'
import type { PerimeterWall } from '@/building/model/model'
import { createLength, createVec2 } from '@/shared/geometry'

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
    expect(tool.state.selectedPerimeterId).toBeNull()
    expect(tool.state.targetPosition).toBeNull()
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toBeNull()
  })

  it('should set target wall and calculate middle position', () => {
    const perimeterId = createPerimeterId()
    const wallId = createPerimeterWallId()

    // Mock wall with 1000mm length
    const mockWall: PerimeterWall = {
      id: wallId,
      thickness: createLength(440),
      constructionMethodId: 'method1' as any,
      openings: [],
      insideLength: createLength(1000),
      outsideLength: createLength(1000),
      wallLength: createLength(1000),
      insideLine: {
        start: createVec2(0, 0),
        end: createVec2(1000, 0)
      },
      outsideLine: {
        start: createVec2(0, 440),
        end: createVec2(1000, 440)
      },
      direction: createVec2(1, 0),
      outsideDirection: createVec2(0, 1)
    }

    const mockPerimeter = {
      id: perimeterId,
      walls: [mockWall],
      corners: []
    }

    // Manually set the state to test the logic
    tool.state.selectedPerimeterId = perimeterId
    tool.state.selectedWallId = wallId
    tool.state.wall = mockWall
    tool.state.perimeter = mockPerimeter as any
    tool.updateTargetPosition(createLength(500))

    expect(tool.state.selectedWallId).toBe(wallId)
    expect(tool.state.selectedPerimeterId).toBe(perimeterId)
    expect(tool.state.targetPosition).toBe(500)
    expect(tool.state.isValidSplit).toBe(true)
  })

  it('should validate split positions correctly', () => {
    const perimeterId = createPerimeterId()
    const wallId = createPerimeterWallId()

    const mockWall: PerimeterWall = {
      id: wallId,
      thickness: createLength(440),
      constructionMethodId: 'method1' as any,
      openings: [
        {
          id: 'opening1' as any,
          type: 'door',
          width: createLength(800),
          height: createLength(2000),
          offsetFromStart: createLength(200),
          sillHeight: createLength(0)
        }
      ],
      insideLength: createLength(2000),
      outsideLength: createLength(2000),
      wallLength: createLength(2000),
      insideLine: {
        start: createVec2(0, 0),
        end: createVec2(2000, 0)
      },
      outsideLine: {
        start: createVec2(0, 440),
        end: createVec2(2000, 440)
      },
      direction: createVec2(1, 0),
      outsideDirection: createVec2(0, 1)
    }

    const mockPerimeter = {
      id: perimeterId,
      walls: [mockWall],
      corners: []
    }

    // Manually set the state to test validation logic
    tool.state.selectedPerimeterId = perimeterId
    tool.state.selectedWallId = wallId
    tool.state.wall = mockWall
    tool.state.perimeter = mockPerimeter as any

    // Test valid position (before opening)
    tool.updateTargetPosition(createLength(100))
    expect(tool.state.isValidSplit).toBe(true)
    expect(tool.state.splitError).toBeNull()

    // Test invalid position (inside opening: 200-1000mm)
    tool.updateTargetPosition(createLength(500))
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toContain('door opening')

    // Test valid position (after opening)
    tool.updateTargetPosition(createLength(1500))
    expect(tool.state.isValidSplit).toBe(true)
    expect(tool.state.splitError).toBeNull()

    // Test invalid positions at boundaries
    tool.updateTargetPosition(createLength(0))
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toContain('wall bounds')

    tool.updateTargetPosition(createLength(2000))
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.splitError).toContain('wall bounds')
  })

  it('should have proper tool metadata', () => {
    expect(tool.id).toBe('perimeter.split-wall')
    expect(tool.overlayComponent).toBeDefined()
    expect(tool.inspectorComponent).toBeDefined()
  })
})
