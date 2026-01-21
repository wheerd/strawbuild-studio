import { type Mocked, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PerimeterCornerId,
  PerimeterCornerWithGeometry,
  PerimeterWallId,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry,
  Storey
} from '@/building/model'
import {
  createFloorAssemblyId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import { type StoreActions, getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { ConstructionModel } from '@/construction/model'
import { createCuboid } from '@/construction/shapes'
import { Bounds3D, IDENTITY, ZERO_VEC2, newVec2, newVec3 } from '@/shared/geometry'
import { partial, partialMock } from '@/test/helpers'

import { constructWall } from './construction'
import { resolveWallAssembly } from './index'

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

vi.mock('./index', () => ({
  resolveWallAssembly: vi.fn()
}))

vi.mock('@/construction/storeys/context', () => ({
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

  const createMockWall = (
    id: string,
    insideLength: number,
    wallAssemblyId: string,
    startCornerId: PerimeterCornerId = 'corner' as PerimeterCornerId,
    endCornerId: PerimeterCornerId = 'corner' as PerimeterCornerId
  ) =>
    partial<PerimeterWallWithGeometry>({
      id: id as any,
      startCornerId,
      endCornerId,
      thickness: 400,
      wallAssemblyId: wallAssemblyId as any,
      entityIds: [],
      insideLength,
      outsideLength: insideLength,
      wallLength: insideLength,
      insideLine: {
        start: ZERO_VEC2,
        end: newVec2(insideLength, 0)
      },
      outsideLine: {
        start: newVec2(0, 400),
        end: newVec2(insideLength, 400)
      },
      direction: newVec2(1, 0),
      outsideDirection: newVec2(0, 1)
    })

  const createMockCorner = (
    angle: number,
    id?: PerimeterCornerId,
    previousWallId: PerimeterWallId = 'wall' as PerimeterWallId,
    nextWallId: PerimeterWallId = 'wall' as PerimeterWallId
  ) =>
    partial<PerimeterCornerWithGeometry>({
      id: id ?? createPerimeterCornerId(),
      previousWallId,
      nextWallId,
      insidePoint: ZERO_VEC2,
      outsidePoint: ZERO_VEC2,
      constructedByWall: 'previous',
      interiorAngle: angle,
      exteriorAngle: 360 - angle
    })

  const createMockPerimeter = (walls: PerimeterWallWithGeometry[]) =>
    partial<PerimeterWithGeometry>({
      id: perimeterId,
      storeyId,
      referenceSide: 'inside',
      wallIds: walls.map(w => w.id)
    })

  const createMockStorey = (): Storey => ({
    id: storeyId,
    name: 'Ground Floor',
    useDefaultName: false,
    level: 0 as any,
    floorHeight: 3000,
    floorAssemblyId
  })

  const createMockConstructionModel = (id: string): ConstructionModel => ({
    elements: [
      {
        id: `element-${id}` as any,
        transform: IDENTITY,
        bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(1000, 400, 3000)),
        material: 'wood' as any,
        shape: createCuboid(newVec3(1000, 400, 3000))
      }
    ],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: Bounds3D.fromMinMax(newVec3(0, 0, 0), newVec3(1000, 400, 3000))
  })

  let mockModelActions: Mocked<StoreActions>
  let mockConfigActions: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockModelActions = partialMock<StoreActions>({
      getPerimeterById: vi.fn(),
      getPerimeterWallById: vi.fn(),
      getPerimeterCornerById: vi.fn(),
      getStoreyById: vi.fn(),
      getStoreysOrderedByLevel: vi.fn(),
      getStoreyAbove: vi.fn()
    })

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
      id: wallAssemblyId,
      name: 'Test Infill',
      type: 'infill',
      layers: {
        insideThickness: 0,
        insideLayers: [],
        outsideThickness: 400,
        outsideLayers: []
      }
    } as any)

    vi.mocked(resolveWallAssembly).mockReturnValue(mockWallAssembly as any)

    mockWallAssembly.construct.mockImplementation((wall: PerimeterWallWithGeometry) => {
      return createMockConstructionModel(wall.id)
    })
  })

  describe('single wall construction (includeColinear=false)', () => {
    it('should construct a single wall without checking for colinear walls', () => {
      const wallId = createPerimeterWallId()
      const wall = createMockWall(wallId, 5000, wallAssemblyId)
      const corner = createMockCorner(90)

      const perimeter = createMockPerimeter([wall])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)
      mockModelActions.getPerimeterWallById.mockReturnValue(wall)
      mockModelActions.getPerimeterCornerById.mockReturnValue(corner)

      const result = constructWall(wallId, false)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(1)
      expect(mockWallAssembly.construct).toHaveBeenCalledWith(wall, expect.any(Object))
      expect(result.elements).toHaveLength(1)
      expect(result.elements[0]).toHaveProperty('id', `element-${wallId}`)
    })
  })

  describe('colinear wall construction (includeColinear=true)', () => {
    it('should construct and combine three colinear walls', () => {
      const wallId1 = 'wall1' as PerimeterWallId
      const wallId2 = 'wall2' as PerimeterWallId
      const wallId3 = 'wall3' as PerimeterWallId
      const cornerId1 = 'corner1' as PerimeterCornerId
      const cornerId2 = 'corner2' as PerimeterCornerId
      const cornerId3 = 'corner3' as PerimeterCornerId
      const cornerId4 = 'corner4' as PerimeterCornerId

      const wall1 = createMockWall(wallId1, 2000, wallAssemblyId, cornerId1, cornerId2)
      const wall2 = createMockWall(wallId2, 3000, wallAssemblyId, cornerId2, cornerId3)
      const wall3 = createMockWall(wallId3, 1500, wallAssemblyId, cornerId3, cornerId4)

      const defaultCorner = createMockCorner(90)
      const corner1 = createMockCorner(90, cornerId1, undefined, wallId1)
      const corner2 = createMockCorner(180, cornerId2, wallId1, wallId2)
      const corner3 = createMockCorner(180, cornerId3, wallId2, wallId3)
      const corner4 = createMockCorner(90, cornerId4, wallId3)

      const walls = [wall1, wall2, wall3]
      const corners = [corner1, corner2, corner3, corner4]

      const perimeter = createMockPerimeter(walls)

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)
      mockModelActions.getPerimeterWallById.mockImplementation(id => walls.find(w => w.id === id)!)
      mockModelActions.getPerimeterCornerById.mockImplementation(id => corners.find(c => c.id === id) ?? defaultCorner)

      const result = constructWall(wallId2, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(3)
      const callOrder = mockWallAssembly.construct.mock.calls.map(call => call[0].id)
      expect(callOrder).toEqual([wallId1, wallId2, wallId3])
      expect(result.elements).toHaveLength(3)
    })

    it('should handle single wall with no colinear neighbors', () => {
      const wallId = createPerimeterWallId()
      const wall = createMockWall(wallId, 5000, wallAssemblyId)
      const corner = createMockCorner(90)

      const perimeter = createMockPerimeter([wall])

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)
      mockModelActions.getPerimeterWallById.mockReturnValue(wall)
      mockModelActions.getPerimeterCornerById.mockReturnValue(corner)

      constructWall(wallId, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(1)
    })

    it('should stop at non-colinear corners', () => {
      const wallId1 = 'wall1' as PerimeterWallId
      const wallId2 = 'wall2' as PerimeterWallId
      const wallId3 = 'wall3' as PerimeterWallId
      const wallId4 = 'wall3' as PerimeterWallId
      const cornerId1 = 'corner1' as PerimeterCornerId
      const cornerId2 = 'corner2' as PerimeterCornerId
      const cornerId3 = 'corner3' as PerimeterCornerId
      const cornerId4 = 'corner4' as PerimeterCornerId

      const wall1 = createMockWall(wallId1, 1000, wallAssemblyId, cornerId1, cornerId2)
      const wall2 = createMockWall(wallId2, 2000, wallAssemblyId, cornerId2, cornerId3)
      const wall3 = createMockWall(wallId3, 1500, wallAssemblyId, cornerId3, cornerId4)
      const wall4 = createMockWall(wallId4, 3000, wallAssemblyId, cornerId4)

      const defaultCorner = createMockCorner(90)
      const corner1 = createMockCorner(90, cornerId1, undefined, wallId1)
      const corner2 = createMockCorner(180, cornerId2, wallId1, wallId2)
      const corner3 = createMockCorner(90, cornerId3, wallId2, wallId3)
      const corner4 = createMockCorner(90, cornerId4, wallId3, wallId4)

      const walls = [wall1, wall2, wall3, wall4]
      const corners = [corner1, corner2, corner3, corner4]

      const perimeter = createMockPerimeter(walls)

      mockModelActions.getPerimeterById.mockReturnValue(perimeter)
      mockModelActions.getPerimeterWallById.mockImplementation(id => walls.find(w => w.id === id)!)
      mockModelActions.getPerimeterCornerById.mockImplementation(id => corners.find(c => c.id === id) ?? defaultCorner)

      constructWall(wallId2, true)

      expect(mockWallAssembly.construct).toHaveBeenCalledTimes(2)

      const callOrder = mockWallAssembly.construct.mock.calls.map(call => call[0].id)
      expect(callOrder).toEqual([wallId1, wallId2])
    })
  })
})
