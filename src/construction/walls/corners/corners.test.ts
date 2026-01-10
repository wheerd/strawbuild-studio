import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PerimeterCornerId,
  PerimeterCornerWithGeometry,
  PerimeterWallId,
  PerimeterWallWithGeometry,
  WallAssemblyId
} from '@/building/model'
import { createPerimeterWallId } from '@/building/model/ids'
import { type WallAssemblyConfig } from '@/construction/config'
import type { WallLayersConfig } from '@/construction/walls'
import { type Length, type Vec2, ZERO_VEC2, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { type WallContext, calculateWallCornerInfo, getWallContext } from './corners'

// Mock the config actions
vi.mock('@/construction/config', () => ({
  getConfigActions: () => ({
    getWallAssemblyById: (id: WallAssemblyId) => mockAssemblies.find(a => a.id === id) ?? null
  })
}))

vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getPerimeterCornerById: (id: PerimeterCornerId) => mockCorners.find(a => a.id === id) ?? null,
    getPerimeterWallById: (id: PerimeterWallId) => mockWalls.find(a => a.id === id) ?? null
  })
}))

const mockAssemblies: WallAssemblyConfig[] = []
const mockCorners: PerimeterCornerWithGeometry[] = []
const mockWalls: PerimeterWallWithGeometry[] = []

// Mock data helpers
function createMockWall(id: string, wallLength: Length, thickness: Length, wallAssemblyId?: string) {
  const startPoint = ZERO_VEC2
  const endPoint = newVec2(wallLength, 0)

  return partial<PerimeterWallWithGeometry>({
    id: (id || createPerimeterWallId()) as PerimeterWallId,
    wallAssemblyId: (wallAssemblyId || 'defaultAssembly') as any,
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: wallLength + thickness * 2,
    insideLine: {
      start: startPoint,
      end: endPoint
    },
    outsideLine: {
      start: newVec2(0, thickness),
      end: newVec2(wallLength, thickness)
    },
    direction: newVec2(1, 0),
    outsideDirection: newVec2(0, 1)
  })
}

function createMockCorner(id: string, insidePoint: Vec2, outsidePoint: Vec2, constructedByWall: 'previous' | 'next') {
  return partial<PerimeterCornerWithGeometry>({
    id: id as PerimeterCornerId,
    insidePoint,
    outsidePoint,
    constructedByWall,
    interiorAngle: 90, // Default angle for testing
    exteriorAngle: 270 // Default angle for testing
  })
}

function createMockAssembly(id: string, name: string, layers: WallLayersConfig): WallAssemblyConfig {
  return {
    id: id as any,
    name,
    type: 'infill',
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'full',
      width: 60,
      material: 'wood' as any
    },
    triangularBattens: {
      size: 30,
      material: 'batten' as any,
      inside: false,
      outside: false,
      minLength: 100
    },
    layers
  }
}

describe('Corner Calculations', () => {
  beforeEach(() => {
    mockAssemblies.length = 0
    mockCorners.length = 0
    mockWalls.length = 0

    mockAssemblies.push(
      createMockAssembly('defaultAssembly', 'Default', {
        insideLayers: [],
        outsideLayers: [],
        insideThickness: 0,
        outsideThickness: 0
      })
    )
  })

  describe('getWallContext', () => {
    it('should return correct context for wall', () => {
      const wall = partial<PerimeterWallWithGeometry>({
        startCornerId: 'outcorner_start',
        endCornerId: 'outcorner_end'
      })
      const previousWall = partial<PerimeterWallWithGeometry>({ id: 'outwall_previous' })
      const nextWall = partial<PerimeterWallWithGeometry>({ id: 'outwall_next' })
      mockWalls.push(wall, previousWall, nextWall)

      const startCorner = partial<PerimeterCornerWithGeometry>({
        id: 'outcorner_start',
        previousWallId: 'outwall_previous'
      })
      const endCorner = partial<PerimeterCornerWithGeometry>({
        id: 'outcorner_end',
        nextWallId: 'outwall_next'
      })
      mockCorners.push(startCorner, endCorner)

      const context = getWallContext(wall)

      expect(context.startCorner).toBe(startCorner)
      expect(context.endCorner).toBe(endCorner)
      expect(context.previousWall).toBe(previousWall)
      expect(context.nextWall).toBe(nextWall)
    })
  })

  describe('calculateWallCornerInfo', () => {
    let mockContext: WallContext

    beforeEach(() => {
      const layers: WallLayersConfig = {
        insideThickness: 30,
        insideLayers: [],
        outsideThickness: 50,
        outsideLayers: []
      }

      const previousAssembly = createMockAssembly('assembly-1', 'Previous Assembly', layers)
      const nextAssembly = createMockAssembly('assembly-2', 'Next Assembly', layers)
      const currentAssembly = createMockAssembly('assembly-3', 'Current Assembly', layers)

      mockAssemblies.push(previousAssembly, nextAssembly, currentAssembly)

      const startCorner = createMockCorner('start-corner', newVec2(0, 0), newVec2(-200, 500), 'next')
      const endCorner = createMockCorner('end-corner', newVec2(3000, 0), newVec2(3300, 500), 'previous')
      const previousWall = createMockWall('prev-wall', 2000, 300, 'assembly-1')
      const nextWall = createMockWall('next-wall', 2500, 300, 'assembly-2')

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
      const wall = createMockWall('test-wall', 3000, 300)

      // Create corners with known positions that will create extensions
      // Start corner: inside at (-200, 0), outside at (-200, 300) - 200mm extension to the left
      // End corner: inside at (3300, 0), outside at (3300, 300) - 300mm extension to the right
      const startCorner = createMockCorner('start-corner', newVec2(-200, 0), newVec2(-200, 300), 'next')
      const endCorner = createMockCorner('end-corner', newVec2(3300, 0), newVec2(3300, 300), 'previous')

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
      const wall = createMockWall('test-wall', 3000, 300)

      // Create corners that are not constructed by this wall with extensions
      const startCorner = createMockCorner('start-corner', newVec2(-200, 0), newVec2(-200, 300), 'previous')
      const endCorner = createMockCorner('end-corner', newVec2(3300, 0), newVec2(3300, 300), 'next')

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
      const wall = createMockWall('test-wall', 3000, 300)

      // Create corners where inner extension is larger than outer extension
      // Start corner: inside at (-250, 0), outside at (-100, 300)
      // End corner: inside at (3320, 0), outside at (3150, 300)
      const startCorner = createMockCorner('start-corner', newVec2(-250, 0), newVec2(-100, 300), 'previous')
      const endCorner = createMockCorner('end-corner', newVec2(3320, 0), newVec2(3150, 300), 'next')

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

    it('should throw error when assemblies are not found', () => {
      mockAssemblies.length = 0

      const wall = createMockWall('test-wall', 3000, 300)

      expect(() => calculateWallCornerInfo(wall, mockContext)).toThrow('Invalid wall assembly')
    })

    it('should handle zero extension distances', () => {
      const wall = createMockWall('test-wall', 3000, 300)

      // Create corners positioned exactly at layer thicknesses to result in zero extension
      // Start corner: inside at (-30, 0), outside at (-50, 300) - exactly at layer thickness
      // End corner: inside at (3030, 0), outside at (3050, 300) - exactly at layer thickness
      const startCorner = createMockCorner('start-corner', newVec2(-30, 0), newVec2(-50, 300), 'next')
      const endCorner = createMockCorner('end-corner', newVec2(3030, 0), newVec2(3050, 300), 'previous')

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
      const wall = createMockWall('test-wall', 3000, 300)

      // Create simple corners for ID testing
      const startCorner = createMockCorner('start-corner', newVec2(-100, 0), newVec2(-100, 300), 'next')
      const endCorner = createMockCorner('end-corner', newVec2(3100, 0), newVec2(3100, 300), 'previous')

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
})
