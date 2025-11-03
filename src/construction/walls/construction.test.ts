import { vec2, vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createFloorAssemblyId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { Perimeter, PerimeterCorner, PerimeterWall, Storey } from '@/building/model/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { ConstructionModel } from '@/construction/model'
import { Bounds3D } from '@/shared/geometry'

import { constructWall } from './construction'
import { WALL_ASSEMBLIES } from './index'

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

vi.mock('./index', () => ({
  WALL_ASSEMBLIES: {}
}))

vi.mock('./segmentation', () => ({
  createWallStoreyContext: vi.fn(() => ({
    storeyHeight: 3000,
    floorTopOffset: 0,
    ceilingBottomOffset: 0
  }))
}))

describe('constructWall', () => {
  const perimeterId = createPerimeterId()
  const storeyId = createStoreyId()
  const floorAssemblyId = createFloorAssemblyId()
  const wallAssemblyId = createWallAssemblyId()

  const mockWallAssembly = {
    construct: vi.fn()
  }

  const mockFloorAssembly = {
    type: 'monolithic' as const,
    height: 200
  }

  const createMockWall = (id: string, insideLength: number, wallAssemblyId: string): PerimeterWall => ({
    id: id as any,
    thickness: 400,
    wallAssemblyId: wallAssemblyId as any,
    openings: [],
    insideLength,
    outsideLength: insideLength,
    wallLength: insideLength,
    insideLine: {
      start: vec2.fromValues(0, 0),
      end: vec2.fromValues(insideLength, 0)
    },
    outsideLine: {
      start: vec2.fromValues(0, 400),
      end: vec2.fromValues(insideLength, 400)
    },
    direction: vec2.fromValues(1, 0),
    outsideDirection: vec2.fromValues(0, 1)
  })

  const createMockCorner = (angle: number): PerimeterCorner => ({
    id: createPerimeterCornerId(),
    insidePoint: vec2.fromValues(0, 0),
    outsidePoint: vec2.fromValues(0, 0),
    constructedByWall: 'previous',
    interiorAngle: angle,
    exteriorAngle: 360 - angle
  })

  const createMockPerimeter = (walls: PerimeterWall[], corners: PerimeterCorner[]): Perimeter => ({
    id: perimeterId,
    storeyId,
    referenceSide: 'inside',
    referencePolygon: corners.map(corner => vec2.clone(corner.insidePoint)),
    walls,
    corners
  })

  const createMockStorey = (): Storey => ({
    id: storeyId,
    name: 'Ground Floor',
    level: 0 as any,
    height: 3000,
    floorAssemblyId
  })

  const createMockConstructionModel = (id: string): ConstructionModel => ({
    elements: [
      {
        id: `element-${id}` as any,
        transform: { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) },
        bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 400, 3000)),
        material: 'wood' as any,
        shape: {
          type: 'cuboid',
          size: vec3.fromValues(1000, 400, 3000),
          offset: vec3.fromValues(0, 0, 0),
          bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 400, 3000))
        }
      }
    ],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 400, 3000))
  })

  let mockModelActions: any
  let mockConfigActions: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockModelActions = {
      getPerimeterById: vi.fn(),
      getStoreyById: vi.fn(),
      getStoreysOrderedByLevel: vi.fn(),
      getStoreyAbove: vi.fn()
    }

    mockConfigActions = {
      getWallAssemblyById: vi.fn(),
      getFloorAssemblyById: vi.fn()
    }

    vi.mocked(getModelActions).mockReturnValue(mockModelActions)
    vi.mocked(getConfigActions).mockReturnValue(mockConfigActions)

    mockModelActions.getStoreyById.mockReturnValue(createMockStorey())
    mockModelActions.getStoreysOrderedByLevel.mockReturnValue([createMockStorey()])
    mockModelActions.getStoreyAbove.mockReturnValue(null)
    mockConfigActions.getFloorAssemblyById.mockReturnValue(mockFloorAssembly as any)
    mockConfigActions.getWallAssemblyById.mockReturnValue({
      type: 'infill',
      layers: {
        insideThickness: 0,
        insideLayers: [],
        outsideThickness: 400,
        outsideLayers: []
      }
    } as any)

    WALL_ASSEMBLIES.infill = mockWallAssembly as any

    mockWallAssembly.construct.mockImplementation((wall: PerimeterWall) => {
      return createMockConstructionModel(wall.id)
    })
  })

  describe('single wall construction (includeColinear=false)', () => {
    it('should construct a single wall without checking for colinear walls', () => {
      const wallId = createPerimeterWallId()
      const wall = createMockWall(wallId, 5000, wallAssemblyId)
      const corner1 = createMockCorner(90)
      const corner2 = createMockCorner(90)

      const perimeter = createMockPerimeter([wall], [corner1, corner2])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)

      const result = constructWall(perimeterId, wallId, false)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(1)
      expect(mockWallAssembly.construct).toHaveBeenCalledWith(wall, perimeter, expect.any(Object), expect.any(Object))
      expect(result.elements).toHaveLength(1)
      expect(result.elements[0]).toHaveProperty('id', `element-${wallId}`)
    })
  })

  describe('colinear wall construction (includeColinear=true)', () => {
    it('should construct and combine three colinear walls', () => {
      const wallId1 = createPerimeterWallId()
      const wallId2 = createPerimeterWallId()
      const wallId3 = createPerimeterWallId()

      const wall1 = createMockWall(wallId1, 2000, wallAssemblyId)
      const wall2 = createMockWall(wallId2, 3000, wallAssemblyId)
      const wall3 = createMockWall(wallId3, 1500, wallAssemblyId)

      const corner1 = createMockCorner(90)
      const corner2 = createMockCorner(180)
      const corner3 = createMockCorner(180)
      const corner4 = createMockCorner(90)

      const perimeter = createMockPerimeter([wall1, wall2, wall3], [corner1, corner2, corner3, corner4])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)

      const result = constructWall(perimeterId, wallId2, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(3)
      expect(mockWallAssembly.construct).toHaveBeenCalledWith(wall1, perimeter, expect.any(Object), expect.any(Object))
      expect(mockWallAssembly.construct).toHaveBeenCalledWith(wall2, perimeter, expect.any(Object), expect.any(Object))
      expect(mockWallAssembly.construct).toHaveBeenCalledWith(wall3, perimeter, expect.any(Object), expect.any(Object))

      expect(result.elements).toHaveLength(3)
    })

    it('should handle single wall with no colinear neighbors', () => {
      const wallId = createPerimeterWallId()
      const wall = createMockWall(wallId, 5000, wallAssemblyId)

      const corner1 = createMockCorner(90)
      const corner2 = createMockCorner(90)

      const perimeter = createMockPerimeter([wall], [corner1, corner2])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)

      constructWall(perimeterId, wallId, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(1)
    })

    it('should find colinear walls in both directions', () => {
      const wallId1 = createPerimeterWallId()
      const wallId2 = createPerimeterWallId()
      const wallId3 = createPerimeterWallId()

      const wall1 = createMockWall(wallId1, 1000, wallAssemblyId)
      const wall2 = createMockWall(wallId2, 2000, wallAssemblyId)
      const wall3 = createMockWall(wallId3, 1500, wallAssemblyId)

      const corner1 = createMockCorner(90)
      const corner2 = createMockCorner(180)
      const corner3 = createMockCorner(180)
      const corner4 = createMockCorner(90)

      const perimeter = createMockPerimeter([wall1, wall2, wall3], [corner1, corner2, corner3, corner4])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)

      constructWall(perimeterId, wallId1, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(3)

      const callOrder = mockWallAssembly.construct.mock.calls.map(call => call[0].id)
      expect(callOrder).toEqual([wallId1, wallId2, wallId3])
    })

    it('should stop at non-colinear corners', () => {
      const wallId1 = createPerimeterWallId()
      const wallId2 = createPerimeterWallId()
      const wallId3 = createPerimeterWallId()
      const wallId4 = createPerimeterWallId()

      const wall1 = createMockWall(wallId1, 1000, wallAssemblyId)
      const wall2 = createMockWall(wallId2, 2000, wallAssemblyId)
      const wall3 = createMockWall(wallId3, 1500, wallAssemblyId)
      const wall4 = createMockWall(wallId4, 3000, wallAssemblyId)

      const corner1 = createMockCorner(90)
      const corner2 = createMockCorner(180)
      const corner3 = createMockCorner(90)
      const corner4 = createMockCorner(90)

      const perimeter = createMockPerimeter([wall1, wall2, wall3, wall4], [corner1, corner2, corner3, corner4])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)

      constructWall(perimeterId, wallId2, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(2)

      const callOrder = mockWallAssembly.construct.mock.calls.map(call => call[0].id)
      expect(callOrder).toEqual([wallId1, wallId2])
    })
  })
})
