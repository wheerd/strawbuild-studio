import { describe, it, expect } from 'vitest'
import { calculateWallCornerInfo, calculateWallConstructionLength } from './corners'
import { createVec2, createLength, type Length } from '@/shared/geometry'
import type { PerimeterWall, PerimeterCorner, Perimeter } from '@/shared/types/model'
import { createPerimeterWallId, createPerimeterId, createPerimeterConstructionMethodId } from '@/shared/types/ids'

// Mock data helpers
function createMockWall(wallLength: Length, thickness: Length): PerimeterWall {
  const startPoint = createVec2(0, 0)
  const endPoint = createVec2(wallLength, 0)

  return {
    id: createPerimeterWallId(),
    constructionMethodId: createPerimeterConstructionMethodId(),
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: (wallLength + thickness * 2) as Length, // Simple assumption for test
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
  }
}

describe('Corner Calculations', () => {
  const wallLength = 3000 as Length
  const thickness = 300 as Length

  describe('calculateWallCornerInfo', () => {
    it('should calculate corner info with proper corner assignment', () => {
      // Create a simple rectangular perimeter with 4 walls and 4 corners
      const wall0 = createMockWall(wallLength, thickness) // bottom wall
      const wall1 = createMockWall(wallLength, thickness) // right wall
      const wall2 = createMockWall(wallLength, thickness) // top wall
      const wall3 = createMockWall(wallLength, thickness) // left wall

      // Create corners - for wall[i], corner[i] is start and corner[i+1] is end
      const corner0 = createMockCorner('corner-0', [0, 0], [-150, 450], 'next') // start of wall0, belongs to wall0
      const corner1 = createMockCorner('corner-1', [3000, 0], [3150, 450], 'previous') // end of wall0, belongs to wall0
      const corner2 = createMockCorner('corner-2', [3000, 3000], [3150, 3450], 'next') // start of wall2, belongs to wall2
      const corner3 = createMockCorner('corner-3', [0, 3000], [-150, 3450], 'previous') // end of wall3, belongs to wall3

      const walls = [wall0, wall1, wall2, wall3]
      const corners = [corner0, corner1, corner2, corner3]
      const perimeter = createMockPerimeter(walls, corners)

      // Test wall0 - should have corner0 as start (belongs to wall0 = 'next') and corner1 as end (belongs to wall0 = 'previous')
      const result = calculateWallCornerInfo(wall0, perimeter)

      expect(result.startCorner).toBeDefined()
      expect(result.endCorner).toBeDefined()

      expect(result.startCorner?.constructedByThisWall).toBe(true) // corner0 belongs to wall0
      expect(result.endCorner?.constructedByThisWall).toBe(true) // corner1 belongs to wall0
    })

    it('should calculate correct extension distances and constructedByWall flags', () => {
      const wallLength = createLength(3000) // 3m wall
      const thickness = createLength(440) // 44cm thickness

      const wall = createMockWall(wallLength, thickness)

      // Create corners with significant extensions
      const startCorner = createMockCorner('start-corner', [0, 0], [-200, 500], 'next') // belongs to this wall
      const endCorner = createMockCorner('end-corner', [3000, 0], [3300, 500], 'previous') // belongs to this wall

      const corners = [startCorner, endCorner]
      const perimeter = createMockPerimeter([wall], corners)

      const result = calculateWallCornerInfo(wall, perimeter)

      // Start corner should belong to this wall and have extension distance
      expect(result.startCorner).toBeDefined()
      expect(result.startCorner!.constructedByThisWall).toBe(true)
      expect(result.startCorner!.extensionDistance).toBeGreaterThan(0)

      // End corner should belong to this wall and have extension distance
      expect(result.endCorner).toBeDefined()
      expect(result.endCorner!.constructedByThisWall).toBe(true)
      expect(result.endCorner!.extensionDistance).toBeGreaterThan(0)
    })

    it('should correctly identify corners that do not belong to the wall', () => {
      const wallLength = createLength(3000) // 3m wall
      const thickness = createLength(440) // 44cm thickness

      const wall = createMockWall(wallLength, thickness)

      // Create corners that don't belong to this wall
      const startCorner = createMockCorner('start-corner', [0, 0], [-200, 500], 'previous') // doesn't belong to this wall
      const endCorner = createMockCorner('end-corner', [3000, 0], [3300, 500], 'next') // doesn't belong to this wall

      const corners = [startCorner, endCorner]
      const perimeter = createMockPerimeter([wall], corners)

      const result = calculateWallCornerInfo(wall, perimeter)

      // Start corner should not belong to this wall but still have extension distance
      expect(result.startCorner).toBeDefined()
      expect(result.startCorner!.constructedByThisWall).toBe(false)
      expect(result.startCorner!.extensionDistance).toBeGreaterThan(0)

      // End corner should not belong to this wall but still have extension distance
      expect(result.endCorner).toBeDefined()
      expect(result.endCorner!.constructedByThisWall).toBe(false)
      expect(result.endCorner!.extensionDistance).toBeGreaterThan(0)
    })
  })

  describe('calculateWallConstructionLength', () => {
    it('should calculate construction length including assigned corners', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [0, 0], [-150, 450], 'next')
      const endCorner = createMockCorner('end-corner', [3000, 0], [3150, 450], 'previous')

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should be base length + extensions from both corners
      expect(result.constructionLength).toBeGreaterThan(wallLength)
      expect(result.startExtension).toBeGreaterThan(0)
      expect(result.endExtension).toBeGreaterThan(0)
    })

    it('should not include extensions for corners that do not belong to this wall', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [0, 0], [-150, 450], 'previous') // not this wall's
      const endCorner = createMockCorner('end-corner', [3000, 0], [3150, 450], 'next') // not this wall's

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should be just the base wall length
      expect(result.constructionLength).toBe(wallLength)
      expect(result.startExtension).toBe(0)
      expect(result.endExtension).toBe(0)
    })

    it('should handle mixed corner ownership', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [0, 0], [-150, 450], 'next') // this wall's
      const endCorner = createMockCorner('end-corner', [3000, 0], [3150, 450], 'next') // not this wall's

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should include only start extension
      expect(result.constructionLength).toBeGreaterThan(wallLength)
      expect(result.startExtension).toBeGreaterThan(0)
      expect(result.endExtension).toBe(0)
    })

    it('should use maximum of inner and outer extensions for corner calculation', () => {
      const wall = createMockWall(wallLength, thickness)

      // Create a corner where inner extension is larger than outer extension (concave corner scenario)
      // This simulates an inner corner where the inside point extends further than the outside point
      const startCornerWithLargerInnerExtension = createMockCorner(
        'inner-corner',
        [-500, 0], // Inside point extends much further back
        [-100, 400], // Outside point extends less
        'next'
      )

      // Create a corner where outer extension is larger (convex corner scenario)
      const endCornerWithLargerOuterExtension = createMockCorner(
        'outer-corner',
        [3100, 0], // Inside point extends slightly
        [3500, 400], // Outside point extends much further
        'previous'
      )

      const result = calculateWallConstructionLength(
        wall,
        startCornerWithLargerInnerExtension,
        endCornerWithLargerOuterExtension
      )

      // Should include extensions from both corners, using the maximum extension calculation
      expect(result.constructionLength).toBeGreaterThan(wallLength)
      expect(result.startExtension).toBeGreaterThan(0)
      expect(result.endExtension).toBeGreaterThan(0)

      // The start extension should be large due to the inner point being far from the wall
      // In this case, the inner extension (from inside line to inside point) should be larger
      // than the outer extension (from outside line to outside point)
      expect(result.startExtension).toBeGreaterThan(100) // Should use the larger inner extension

      // The end extension should be large due to the outer point being far from the wall
      expect(result.endExtension).toBeGreaterThan(100) // Should use the larger outer extension
    })
  })
})
