import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Constraint } from '@/building/model'
import type { PerimeterId, PerimeterWallId, StoreyId } from '@/building/model/ids'
import { createStoreyId, createWallAssemblyId } from '@/building/model/ids'
import type { ConstraintsSlice } from '@/building/store/slices/constraintsSlice'
import { createConstraintsSlice } from '@/building/store/slices/constraintsSlice'
import type { PerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { createPerimetersSlice } from '@/building/store/slices/perimeterSlice'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon'

import {
  createLShapedBoundary,
  createRectangularBoundary,
  expectConsistentPerimeterReferences,
  expectGeometryExists,
  expectNoOrphanedEntities
} from './testHelpers'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)

type CombinedSlice = PerimetersSlice & ConstraintsSlice

/**
 * Sets up a test environment with both perimeter and constraints slices.
 */
function setupCombinedSlice() {
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockStore = {} as any
  const testStoreyId = createStoreyId()

  const perimeterSlice = createPerimetersSlice(mockSet, mockGet, mockStore)
  const constraintsSlice = createConstraintsSlice(mockSet, mockGet, mockStore)

  const slice = {
    ...perimeterSlice,
    ...constraintsSlice,
    timestamps: {},
    actions: {
      ...perimeterSlice.actions,
      ...constraintsSlice.actions
    }
  } as any as CombinedSlice

  mockGet.mockImplementation(() => slice)

  mockSet.mockImplementation((updater: any) => {
    if (typeof updater === 'function') {
      updater(slice)
    }
  })

  return { slice, testStoreyId }
}

/** Helper: get all constraints from the slice as an array */
function getAllConstraints(slice: CombinedSlice): Constraint[] {
  return Object.values(slice.buildingConstraints)
}

/** Helper: get constraints of a specific type */
function getConstraintsByType<T extends Constraint['type']>(
  slice: CombinedSlice,
  type: T
): Extract<Constraint, { type: T }>[] {
  return getAllConstraints(slice).filter((c): c is Extract<Constraint, { type: T }> => c.type === type)
}

describe('constraintsSlice - topology constraint transfer', () => {
  let slice: CombinedSlice
  let testStoreyId: StoreyId
  let perimeterId: PerimeterId

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)

    const setup = setupCombinedSlice()
    slice = setup.slice
    testStoreyId = setup.testStoreyId
  })

  describe('Wall Split - constraint transfer', () => {
    let wallIds: PerimeterWallId[]

    beforeEach(() => {
      const boundary = createRectangularBoundary(10000, 5000)
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      perimeterId = perimeter.id
      wallIds = [...perimeter.wallIds]
    })

    it('should add a colinear constraint at the split point', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const colinearConstraints = getConstraintsByType(slice, 'colinearCorner')
      expect(colinearConstraints).toHaveLength(1)

      const colinear = colinearConstraints[0]
      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const newCornerId = updatedWall.endCornerId

      // The colinear constraint should reference the split point corner
      expect(colinear.corner).toBe(newCornerId)
    })

    it('should keep perpendicular constraint on the original wall when shared corner is at the start', () => {
      const wallToSplit = wallIds[0]
      const wall = slice.actions.getPerimeterWallById(wallToSplit)
      const startCornerId = wall.startCornerId

      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: startCornerId
      })

      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const perpConstraints = getConstraintsByType(slice, 'perpendicularCorner')
      expect(perpConstraints).toHaveLength(1)
      const perp = perpConstraints[0]
      // The corner should remain at the start of wallToSplit (junction with prevWall)
      expect(perp.corner).toBe(startCornerId)
    })

    it('should move perpendicular constraint to the new wall when shared corner is at the end', () => {
      const wallToSplit = wallIds[0]
      const wall = slice.actions.getPerimeterWallById(wallToSplit)
      const endCornerId = wall.endCornerId

      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: endCornerId
      })

      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const perpConstraints = getConstraintsByType(slice, 'perpendicularCorner')
      expect(perpConstraints).toHaveLength(1)
      const perp = perpConstraints[0]
      // The corner should remain at the original end corner (now end of newWallId)
      expect(perp.corner).toBe(endCornerId)
    })

    it('should duplicate parallel constraint to the new wall without distance', () => {
      const wallToSplit = wallIds[0]
      const oppositeWallId = wallIds[2]

      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: wallToSplit,
        wallB: oppositeWallId,
        distance: 5000
      })

      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const parallelConstraints = getConstraintsByType(slice, 'parallel')
      expect(parallelConstraints).toHaveLength(2)

      // Original should keep its distance
      const originalParallel = parallelConstraints.find(
        p => [p.wallA, p.wallB].includes(wallToSplit) && [p.wallA, p.wallB].includes(oppositeWallId)
      )
      expect(originalParallel).toBeDefined()
      expect(originalParallel!.distance).toBe(5000)

      // Duplicate should NOT have distance
      const newParallel = parallelConstraints.find(
        p => [p.wallA, p.wallB].includes(newWallId!) && [p.wallA, p.wallB].includes(oppositeWallId)
      )
      expect(newParallel).toBeDefined()
      expect(newParallel!.distance).toBeUndefined()
    })

    it('should split distance constraint into two', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      slice.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: wallToSplit,
        side: 'right',
        length: wallGeom.insideLength
      })

      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const distanceConstraints = getConstraintsByType(slice, 'wallLength')
      expect(distanceConstraints).toHaveLength(2)

      for (const d of distanceConstraints) {
        expect(d.side).toBe('right')
      }

      // First half: wallToSplit (now the shorter first segment)
      const firstHalf = distanceConstraints.find(d => d.wall === wallToSplit)
      expect(firstHalf).toBeDefined()

      // Second half: newWallId
      const secondHalf = distanceConstraints.find(d => d.wall === newWallId)
      expect(secondHalf).toBeDefined()
    })

    it('should split horizontal constraint into two', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      slice.actions.addBuildingConstraint({
        type: 'horizontalWall',
        wall: wallToSplit
      })

      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const hvConstraints = getConstraintsByType(slice, 'horizontalWall')
      expect(hvConstraints).toHaveLength(2)
    })

    it('should split vertical constraint into two', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      slice.actions.addBuildingConstraint({
        type: 'verticalWall',
        wall: wallToSplit
      })

      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      const vConstraints = getConstraintsByType(slice, 'verticalWall')
      expect(vConstraints).toHaveLength(2)
    })

    it('should handle no constraints gracefully', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      expect(getAllConstraints(slice)).toHaveLength(0)
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      // Only the colinear constraint should be added
      const allConstraints = getAllConstraints(slice)
      expect(allConstraints).toHaveLength(1)
      expect(allConstraints[0].type).toBe('colinearCorner')
    })

    it('should maintain consistent perimeter after split with constraints', () => {
      const wallToSplit = wallIds[0]
      const wall = slice.actions.getPerimeterWallById(wallToSplit)
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: wall.endCornerId
      })
      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: wallToSplit,
        wallB: wallIds[2]
      })
      slice.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: wallToSplit,
        side: 'right',
        length: wallGeom.insideLength
      })

      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)
      expect(newWallId).not.toBeNull()

      expectConsistentPerimeterReferences(slice, perimeterId)
      expectGeometryExists(slice, perimeterId)
      expectNoOrphanedEntities(slice)
    })
  })

  describe('Corner Merge - constraint transfer', () => {
    let wallIds: PerimeterWallId[]

    beforeEach(() => {
      const boundary = createRectangularBoundary(10000, 5000)
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      perimeterId = perimeter.id
      wallIds = [...perimeter.wallIds]
    })

    it('should transfer perpendicular constraint on colinear merge', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      const otherWallId = wallIds[1]
      // Corner between newWallId and otherWallId
      const newWall = slice.actions.getPerimeterWallById(newWallId)
      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: newWall.endCornerId
      })

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      const perpBefore = getConstraintsByType(slice, 'perpendicularCorner')
      expect(perpBefore).toHaveLength(1)

      slice.actions.removePerimeterCorner(splitCornerId)

      const perpAfter = getConstraintsByType(slice, 'perpendicularCorner')
      expect(perpAfter).toHaveLength(1)
      // After merge, the corner should still be between the merged wall and otherWallId
      const perpCorner = slice.perimeterCorners[perpAfter[0].corner]
      expect([perpCorner.previousWallId, perpCorner.nextWallId]).toContain(otherWallId)
    })

    it('should transfer parallel constraint on colinear merge', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      const otherWallId = wallIds[2]
      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: newWallId,
        wallB: otherWallId,
        distance: 5000
      })

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      slice.actions.removePerimeterCorner(splitCornerId)

      const parallelAfter = getConstraintsByType(slice, 'parallel')
      const relevantParallel = parallelAfter.find(p => [p.wallA, p.wallB].includes(otherWallId))
      expect(relevantParallel).toBeDefined()
    })

    it('should not transfer constraints on non-colinear merge', () => {
      const lBoundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const lPerimeter = slice.actions.addPerimeter(testStoreyId, lBoundary, wallAssemblyId, 420)
      const lWallIds = [...lPerimeter.wallIds]

      // The corner between wall[0] and wall[1] is 90°, not 180°
      const corner = Object.values(slice.perimeterCorners).find(
        c => c.perimeterId === lPerimeter.id && c.previousWallId === lWallIds[0] && c.nextWallId === lWallIds[1]
      )
      expect(corner).toBeDefined()

      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: corner!.id
      })

      slice.actions.removePerimeterCorner(corner!.id)

      const perpAfter = getConstraintsByType(slice, 'perpendicularCorner')
      expect(perpAfter).toHaveLength(0)
    })

    it('should transfer distance constraint with geometry-based length on colinear merge', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      slice.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: wallToSplit,
        side: 'right',
        length: 2500
      })
      slice.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: newWallId,
        side: 'right',
        length: 2500
      })

      slice.actions.removePerimeterCorner(splitCornerId)

      const distAfter = getConstraintsByType(slice, 'wallLength')
      expect(distAfter).toHaveLength(1)
      expect(distAfter[0].side).toBe('right')
      expect(distAfter[0].length).toBeGreaterThan(0)
    })

    it('should transfer horizontal constraint on colinear merge', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      slice.actions.addBuildingConstraint({
        type: 'horizontalWall',
        wall: wallToSplit
      })
      slice.actions.addBuildingConstraint({
        type: 'horizontalWall',
        wall: newWallId
      })

      slice.actions.removePerimeterCorner(splitCornerId)

      const hvAfter = getConstraintsByType(slice, 'horizontalWall')
      expect(hvAfter).toHaveLength(1)
    })

    it('should drop mixed horizontal/vertical constraints on merge', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      slice.actions.addBuildingConstraint({
        type: 'horizontalWall',
        wall: wallToSplit
      })
      slice.actions.addBuildingConstraint({
        type: 'verticalWall',
        wall: newWallId
      })

      slice.actions.removePerimeterCorner(splitCornerId)

      const hAfter = getConstraintsByType(slice, 'horizontalWall')
      const vAfter = getConstraintsByType(slice, 'verticalWall')
      expect(hAfter).toHaveLength(0)
      expect(vAfter).toHaveLength(0)
    })

    it('should maintain consistent perimeter after merge with constraints', () => {
      const wallToSplit = wallIds[0]
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]
      const newWallId = slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      // Corner between newWallId and wallIds[1]
      const newWall = slice.actions.getPerimeterWallById(newWallId)
      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: newWall.endCornerId
      })
      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: wallToSplit,
        wallB: wallIds[2]
      })

      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId

      slice.actions.removePerimeterCorner(splitCornerId)

      expectConsistentPerimeterReferences(slice, perimeterId)
      expectGeometryExists(slice, perimeterId)
      expectNoOrphanedEntities(slice)
    })
  })

  describe('Wall Remove and Merge Adjacent - constraint transfer', () => {
    let wallIds: PerimeterWallId[]

    beforeEach(() => {
      const boundary = createLShapedBoundary()
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      perimeterId = perimeter.id
      wallIds = [...perimeter.wallIds]
    })

    it('should transfer constraints when both corners are 180° (colinear)', () => {
      // Create a rectangle, then do two splits on the same wall to get a wall between two 180° corners
      const rectBoundary = createRectangularBoundary(10000, 5000)
      const wallAssemblyId = createWallAssemblyId()
      const rectPerimeter = slice.actions.addPerimeter(testStoreyId, rectBoundary, wallAssemblyId, 420)
      const rectWallIds = [...rectPerimeter.wallIds]

      const wall0Geom = slice._perimeterWallGeometry[rectWallIds[0]]
      const newWallFromSplit = slice.actions.splitPerimeterWall(rectWallIds[0], wall0Geom.wallLength / 3)!

      const newWallGeom = slice._perimeterWallGeometry[newWallFromSplit]
      slice.actions.splitPerimeterWall(newWallFromSplit, newWallGeom.wallLength / 2)!

      // Add a parallel constraint on the wall between two 180° corners
      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: newWallFromSplit,
        wallB: rectWallIds[2]
      })

      slice.actions.removePerimeterWall(newWallFromSplit)

      const parallelAfter = getConstraintsByType(slice, 'parallel')
      const relevantParallel = parallelAfter.find(p => [p.wallA, p.wallB].includes(rectWallIds[2]))
      expect(relevantParallel).toBeDefined()
    })

    it('should drop constraints when corners are not colinear', () => {
      const wallToRemove = wallIds[1]

      slice.actions.addBuildingConstraint({
        type: 'parallel',
        wallA: wallToRemove,
        wallB: wallIds[4]
      })

      slice.actions.removePerimeterWall(wallToRemove)

      const parallelAfter = getConstraintsByType(slice, 'parallel')
      expect(parallelAfter).toHaveLength(0)
    })

    it('should maintain consistent perimeter after wall remove with constraints', () => {
      // Corner between wallIds[0] and wallIds[1]
      const lWall0 = slice.actions.getPerimeterWallById(wallIds[0])
      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: lWall0.endCornerId
      })

      slice.actions.removePerimeterWall(wallIds[1])

      expectConsistentPerimeterReferences(slice, perimeterId)
      expectGeometryExists(slice, perimeterId)
      expectNoOrphanedEntities(slice)
    })
  })

  describe('Split then Merge roundtrip', () => {
    let wallIds: PerimeterWallId[]

    beforeEach(() => {
      const boundary = createRectangularBoundary(10000, 5000)
      const wallAssemblyId = createWallAssemblyId()
      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      perimeterId = perimeter.id
      wallIds = [...perimeter.wallIds]
    })

    it('should handle split followed by merge preserving constraint semantics', () => {
      const wallToSplit = wallIds[0]
      const wall = slice.actions.getPerimeterWallById(wallToSplit)
      const wallGeom = slice._perimeterWallGeometry[wallToSplit]

      slice.actions.addBuildingConstraint({
        type: 'perpendicularCorner',
        corner: wall.endCornerId
      })
      slice.actions.addBuildingConstraint({
        type: 'wallLength',
        wall: wallToSplit,
        side: 'right',
        length: wallGeom.insideLength
      })

      // Split
      slice.actions.splitPerimeterWall(wallToSplit, wallGeom.wallLength / 2)!

      expect(getConstraintsByType(slice, 'perpendicularCorner')).toHaveLength(1)
      expect(getConstraintsByType(slice, 'wallLength')).toHaveLength(2)
      expect(getConstraintsByType(slice, 'colinearCorner')).toHaveLength(1)

      // Merge back
      const updatedWall = slice.actions.getPerimeterWallById(wallToSplit)
      const splitCornerId = updatedWall.endCornerId
      slice.actions.removePerimeterCorner(splitCornerId)

      // After merge: perpendicular transferred, distance merged, colinear cleaned up
      expect(getConstraintsByType(slice, 'perpendicularCorner')).toHaveLength(1)
      expect(getConstraintsByType(slice, 'wallLength')).toHaveLength(1)
      expect(getConstraintsByType(slice, 'colinearCorner')).toHaveLength(0)

      expectConsistentPerimeterReferences(slice, perimeterId)
      expectGeometryExists(slice, perimeterId)
    })
  })
})
