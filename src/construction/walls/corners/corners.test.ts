import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPerimeterConstructionMethodId, createPerimeterId, createPerimeterWallId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import { type ConfigActions, getConfigActions } from '@/construction/config'
import type { LayersConfig, PerimeterConstructionMethod } from '@/construction/config/types'
import { type Length, createLength, createVec2 } from '@/shared/geometry'

import { type WallContext, calculateWallCornerInfo, getWallContext } from './corners'

// Mock the config actions
vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn(() => ({
    getPerimeterConstructionMethodById: vi.fn()
  }))
}))

const mockGetConfigActions = vi.mocked(getConfigActions)

// Mock data helpers
function createMockWall(
  id: string,
  wallLength: Length,
  thickness: Length,
  constructionMethodId?: string
): PerimeterWall {
  const startPoint = createVec2(0, 0)
  const endPoint = createVec2(wallLength, 0)

  return {
    id: (id || createPerimeterWallId()) as any,
    constructionMethodId: (constructionMethodId || createPerimeterConstructionMethodId()) as any,
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: (wallLength + thickness * 2) as Length,
    openings: [],
    insideLine: {
      start: startPoint,
      end: endPoint
    },
    outsideLine: {
      start: createVec2(0, thickness),
      end: createVec2(wallLength, thickness)
    },
    direction: createVec2(1, 0),
    outsideDirection: createVec2(0, 1)
  }
}

function createMockCorner(
  id: string,
  insidePoint: [number, number],
  outsidePoint: [number, number],
  constructedByWall: 'previous' | 'next'
): PerimeterCorner {
  return {
    id: id as any,
    insidePoint: createVec2(insidePoint[0], insidePoint[1]),
    outsidePoint: createVec2(outsidePoint[0], outsidePoint[1]),
    constuctedByWall: constructedByWall
  }
}

function createMockPerimeter(walls: PerimeterWall[], corners: PerimeterCorner[]): Perimeter {
  return {
    id: createPerimeterId(),
    storeyId: 'test-storey' as any,
    walls,
    corners
  } as Perimeter
}

function createMockConstructionMethod(id: string, name: string, layers: LayersConfig): PerimeterConstructionMethod {
  return {
    id: id as any,
    name,
    config: {
      type: 'infill',
      maxPostSpacing: createLength(800),
      minStrawSpace: createLength(70),
      posts: {
        type: 'full',
        width: createLength(60),
        material: 'wood' as any
      },
      openings: {
        padding: createLength(15),
        headerThickness: createLength(60),
        headerMaterial: 'wood' as any,
        sillThickness: createLength(60),
        sillMaterial: 'wood' as any
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: 'straw' as any
      }
    },
    layers
  }
}

describe('Corner Calculations', () => {
  let mockGetPerimeterConstructionMethodById: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPerimeterConstructionMethodById = vi.fn()
    mockGetConfigActions.mockReturnValue({
      getPerimeterConstructionMethodById: mockGetPerimeterConstructionMethodById
    } as unknown as ConfigActions)
  })

  describe('getWallContext', () => {
    it('should return correct context for a wall in the middle of a perimeter', () => {
      const wall0 = createMockWall('wall-0', createLength(3000), createLength(300))
      const wall1 = createMockWall('wall-1', createLength(2000), createLength(300))
      const wall2 = createMockWall('wall-2', createLength(3000), createLength(300))
      const wall3 = createMockWall('wall-3', createLength(2000), createLength(300))

      const corner0 = createMockCorner('corner-0', [0, 0], [-150, 450], 'next')
      const corner1 = createMockCorner('corner-1', [3000, 0], [3150, 450], 'previous')
      const corner2 = createMockCorner('corner-2', [3000, 2000], [3150, 2450], 'next')
      const corner3 = createMockCorner('corner-3', [0, 2000], [-150, 2450], 'previous')

      const walls = [wall0, wall1, wall2, wall3]
      const corners = [corner0, corner1, corner2, corner3]
      const perimeter = createMockPerimeter(walls, corners)

      const context = getWallContext(wall1, perimeter)

      expect(context.startCorner).toBe(corner1)
      expect(context.endCorner).toBe(corner2)
      expect(context.previousWall).toBe(wall0)
      expect(context.nextWall).toBe(wall2)
    })

    it('should handle wraparound for the first wall', () => {
      const wall0 = createMockWall('wall-0', createLength(3000), createLength(300))
      const wall1 = createMockWall('wall-1', createLength(2000), createLength(300))
      const wall2 = createMockWall('wall-2', createLength(3000), createLength(300))

      const corner0 = createMockCorner('corner-0', [0, 0], [-150, 450], 'next')
      const corner1 = createMockCorner('corner-1', [3000, 0], [3150, 450], 'previous')
      const corner2 = createMockCorner('corner-2', [3000, 2000], [3150, 2450], 'next')

      const walls = [wall0, wall1, wall2]
      const corners = [corner0, corner1, corner2]
      const perimeter = createMockPerimeter(walls, corners)

      const context = getWallContext(wall0, perimeter)

      expect(context.startCorner).toBe(corner0)
      expect(context.endCorner).toBe(corner1)
      expect(context.previousWall).toBe(wall2) // Should wrap around
      expect(context.nextWall).toBe(wall1)
    })

    it('should handle wraparound for the last wall', () => {
      const wall0 = createMockWall('wall-0', createLength(3000), createLength(300))
      const wall1 = createMockWall('wall-1', createLength(2000), createLength(300))
      const wall2 = createMockWall('wall-2', createLength(3000), createLength(300))

      const corner0 = createMockCorner('corner-0', [0, 0], [-150, 450], 'next')
      const corner1 = createMockCorner('corner-1', [3000, 0], [3150, 450], 'previous')
      const corner2 = createMockCorner('corner-2', [3000, 2000], [3150, 2450], 'next')

      const walls = [wall0, wall1, wall2]
      const corners = [corner0, corner1, corner2]
      const perimeter = createMockPerimeter(walls, corners)

      const context = getWallContext(wall2, perimeter)

      expect(context.startCorner).toBe(corner2)
      expect(context.endCorner).toBe(corner0) // Should wrap around
      expect(context.previousWall).toBe(wall1)
      expect(context.nextWall).toBe(wall0) // Should wrap around
    })

    it('should throw error when wall is not found in perimeter', () => {
      const wall = createMockWall('missing-wall', createLength(3000), createLength(300))
      const walls = [createMockWall('wall-0', createLength(3000), createLength(300))]
      const corners = [createMockCorner('corner-0', [0, 0], [-150, 450], 'next')]
      const perimeter = createMockPerimeter(walls, corners)

      expect(() => getWallContext(wall, perimeter)).toThrow('Could not find wall with id missing-wall')
    })
  })

  describe('calculateWallCornerInfo', () => {
    let mockContext: WallContext

    beforeEach(() => {
      const layers: LayersConfig = {
        insideThickness: createLength(30),
        outsideThickness: createLength(50)
      }

      const previousMethod = createMockConstructionMethod('method-1', 'Previous Method', layers)
      const nextMethod = createMockConstructionMethod('method-2', 'Next Method', layers)

      mockGetPerimeterConstructionMethodById.mockReturnValueOnce(previousMethod).mockReturnValueOnce(nextMethod)
      const startCorner = createMockCorner('start-corner', [0, 0], [-200, 500], 'next')
      const endCorner = createMockCorner('end-corner', [3000, 0], [3300, 500], 'previous')
      const previousWall = createMockWall('prev-wall', createLength(2000), createLength(300), 'method-1')
      const nextWall = createMockWall('next-wall', createLength(2500), createLength(300), 'method-2')

      mockContext = {
        startCorner,
        endCorner,
        previousWall,
        nextWall
      }
    })

    it('should calculate corner info when both corners are constructed by this wall', () => {
      // Create a wall with specific geometry: wall starts at (0,0) ends at (3000,0)
      // Inside line: (0,0) to (3000,0), Outside line: (0,300) to (3000,300)
      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      // Create corners with known positions that will create extensions
      // Start corner: inside at (-200, 0), outside at (-200, 300) - 200mm extension to the left
      // End corner: inside at (3300, 0), outside at (3300, 300) - 300mm extension to the right
      const startCorner = createMockCorner('start-corner', [-200, 0], [-200, 300], 'next')
      const endCorner = createMockCorner('end-corner', [3300, 0], [3300, 300], 'previous')

      const context = {
        ...mockContext,
        startCorner,
        endCorner
      }

      const result = calculateWallCornerInfo(wall, context)

      expect(result.startCorner.constructedByThisWall).toBe(true)
      expect(result.endCorner.constructedByThisWall).toBe(true)
      // Extension distances are the actual geometric distances minus layer thicknesses
      expect(result.startCorner.extensionDistance).toBe(170) // max(200-50, 200-30) = max(150, 170) = 170
      expect(result.endCorner.extensionDistance).toBe(270) // max(300-50, 300-30) = max(250, 270) = 270
      expect(result.extensionStart).toBe(170) // full extension applied (max of the two)
      expect(result.extensionEnd).toBe(270) // full extension applied
      expect(result.constructionLength).toBe(3440) // 3000 + 170 + 270
    })

    it('should calculate corner info when corners are not constructed by this wall', () => {
      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      // Create corners that are not constructed by this wall with extensions
      const startCorner = createMockCorner('start-corner', [-200, 0], [-200, 300], 'previous')
      const endCorner = createMockCorner('end-corner', [3300, 0], [3300, 300], 'next')

      const context = {
        ...mockContext,
        startCorner,
        endCorner
      }

      const result = calculateWallCornerInfo(wall, context)

      expect(result.startCorner.constructedByThisWall).toBe(false)
      expect(result.endCorner.constructedByThisWall).toBe(false)
      expect(result.startCorner.extensionDistance).toBe(170) // max(200-50, 200-30) = max(150, 170)
      expect(result.endCorner.extensionDistance).toBe(270) // max(300-50, 300-30) = max(250, 270)
      // Since corners are not constructed by this wall, use layer thickness instead
      expect(result.extensionStart).toBe(50) // outside thickness (because 170 > 150, so outside is max)
      expect(result.extensionEnd).toBe(50) // outside thickness (because 270 > 250, so outside is max)
      expect(result.constructionLength).toBe(3100) // 3000 + 50 + 50
    })

    it('should use outside thickness when inner extension is larger', () => {
      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      // Create corners where inner extension is larger than outer extension
      // Start corner: inside at (-250, 0), outside at (-100, 300)
      // End corner: inside at (3320, 0), outside at (3150, 300)
      const startCorner = createMockCorner('start-corner', [-250, 0], [-100, 300], 'previous')
      const endCorner = createMockCorner('end-corner', [3320, 0], [3150, 300], 'next')

      const context = {
        ...mockContext,
        startCorner,
        endCorner
      }

      const result = calculateWallCornerInfo(wall, context)

      expect(result.startCorner.extensionDistance).toBe(220) // max(100-50, 250-30) = max(50, 220)
      expect(result.endCorner.extensionDistance).toBe(290) // max(150-50, 320-30) = max(100, 290)
      // Since corners are not constructed by this wall and inner > outer, use outside thickness
      expect(result.extensionStart).toBe(50) // outside thickness when inner extension is larger
      expect(result.extensionEnd).toBe(50) // outside thickness when inner extension is larger
      expect(result.constructionLength).toBe(3100) // 3000 + 50 + 50
    })

    it('should throw error when construction methods are not found', () => {
      // Reset the mock to return null for both calls
      mockGetPerimeterConstructionMethodById.mockReset()
      mockGetPerimeterConstructionMethodById.mockReturnValue(null)

      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      expect(() => calculateWallCornerInfo(wall, mockContext)).toThrow('Invalid wall construction method')
    })

    it('should handle zero extension distances', () => {
      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      // Create corners positioned exactly at layer thicknesses to result in zero extension
      // Start corner: inside at (-30, 0), outside at (-50, 300) - exactly at layer thickness
      // End corner: inside at (3030, 0), outside at (3050, 300) - exactly at layer thickness
      const startCorner = createMockCorner('start-corner', [-30, 0], [-50, 300], 'next')
      const endCorner = createMockCorner('end-corner', [3030, 0], [3050, 300], 'previous')

      const context = {
        ...mockContext,
        startCorner,
        endCorner
      }

      const result = calculateWallCornerInfo(wall, context)

      expect(result.startCorner.extensionDistance).toBe(0) // max(50-50, 30-30) = max(0, 0)
      expect(result.endCorner.extensionDistance).toBe(0) // max(50-50, 30-30) = max(0, 0)
      expect(result.extensionStart).toBe(0) // full extension applied
      expect(result.extensionEnd).toBe(0) // full extension applied
      expect(result.constructionLength).toBe(3000) // 3000 + 0 + 0
    })

    it('should preserve corner IDs in the result', () => {
      const wall = createMockWall('test-wall', createLength(3000), createLength(300))

      // Create simple corners for ID testing
      const startCorner = createMockCorner('start-corner', [-100, 0], [-100, 300], 'next')
      const endCorner = createMockCorner('end-corner', [3100, 0], [3100, 300], 'previous')

      const context = {
        ...mockContext,
        startCorner,
        endCorner
      }

      const result = calculateWallCornerInfo(wall, context)

      expect(result.startCorner.id).toBe(startCorner.id)
      expect(result.endCorner.id).toBe(endCorner.id)
    })
  })

  describe('integration tests', () => {
    it('should work with getWallContext and calculateWallCornerInfo together', () => {
      const layers: LayersConfig = {
        insideThickness: createLength(30),
        outsideThickness: createLength(50)
      }

      const method1 = createMockConstructionMethod('method-1', 'Method 1', layers)
      const method2 = createMockConstructionMethod('method-2', 'Method 2', layers)

      mockGetPerimeterConstructionMethodById.mockReturnValueOnce(method1).mockReturnValueOnce(method2)

      const wall0 = createMockWall('wall-0', createLength(3000), createLength(300), 'method-1')
      const wall1 = createMockWall('wall-1', createLength(2000), createLength(300), 'method-1')
      const wall2 = createMockWall('wall-2', createLength(3000), createLength(300), 'method-2')

      const corner0 = createMockCorner('corner-0', [0, 0], [-150, 450], 'next')
      const corner1 = createMockCorner('corner-1', [3000, 0], [3150, 450], 'previous')
      const corner2 = createMockCorner('corner-2', [3000, 2000], [3150, 2450], 'next')

      const walls = [wall0, wall1, wall2]
      const corners = [corner0, corner1, corner2]
      const perimeter = createMockPerimeter(walls, corners)

      const context = getWallContext(wall1, perimeter)
      const result = calculateWallCornerInfo(wall1, context)

      expect(context.startCorner).toBe(corner1)
      expect(context.endCorner).toBe(corner2)
      expect(result.startCorner.id).toBe(corner1.id)
      expect(result.endCorner.id).toBe(corner2.id)
      expect(result.constructionLength).toBeGreaterThan(wall1.wallLength)
    })
  })
})
