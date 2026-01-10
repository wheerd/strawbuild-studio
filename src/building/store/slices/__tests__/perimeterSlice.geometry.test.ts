import { describe, expect, it } from 'vitest'

import type { PerimeterWallGeometry } from '@/building/model'
import { createStoreyId, createWallAssemblyId } from '@/building/model/ids'
import { updateEntityGeometry } from '@/building/store/slices/perimeterGeometry'
import { eqVec2, newVec2 } from '@/shared/geometry'

import {
  createLShapedBoundary,
  createRectangularBoundary,
  createTriangularBoundary,
  mockPost,
  setupPerimeterSlice
} from './testHelpers'

describe('perimeterGeometry', () => {
  describe('Corner Geometry', () => {
    describe('Right Angles (90°)', () => {
      it('should calculate corner geometry for rectangular perimeter', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // All corners should have 90° interior angles
        corners.forEach(corner => {
          expect(corner.interiorAngle).toBe(90)
          expect(corner.exteriorAngle).toBe(270)
        })
      })

      it('should compute inside and outside points correctly at 90° corners', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()
        const thickness = 420

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // First corner (bottom-left)
        expect(corners[0].insidePoint[0]).toBe(0)
        expect(corners[0].insidePoint[1]).toBe(0)
        expect(corners[0].outsidePoint[0]).toBe(-thickness)
        expect(corners[0].outsidePoint[1]).toBe(-thickness)

        // Second corner (top-left)
        expect(corners[1].insidePoint[0]).toBe(0)
        expect(corners[1].insidePoint[1]).toBe(5000)
        expect(corners[1].outsidePoint[0]).toBe(-thickness)
        expect(corners[1].outsidePoint[1]).toBe(5000 + thickness)
      })
    })

    describe('Acute Angles (< 90°)', () => {
      it('should calculate interior angle for acute corners', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createTriangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // Triangle corners should have angles that sum to 180°
        const sumInteriorAngles = corners.reduce((sum, corner) => sum + corner.interiorAngle, 0)
        expect(Math.abs(sumInteriorAngles - 180)).toBeLessThan(5) // Allow small rounding error
      })

      it('should have valid inside and outside points for acute corners', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createTriangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        corners.forEach(corner => {
          // Inside and outside points should be different
          expect(corner.insidePoint).not.toEqual(corner.outsidePoint)

          // Both points should be valid numbers
          expect(corner.insidePoint[0]).toBeTypeOf('number')
          expect(corner.insidePoint[1]).toBeTypeOf('number')
          expect(corner.outsidePoint[0]).toBeTypeOf('number')
          expect(corner.outsidePoint[1]).toBeTypeOf('number')
        })
      })
    })

    describe('Reflex Angles (> 180°)', () => {
      it('should calculate angles for reflex corners in L-shaped perimeter', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createLShapedBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // L-shape has 1 reflex corners (270°) and 5 regular corners (90°)
        const reflexCorners = corners.filter(corner => corner.interiorAngle === 270)
        const rightAngleCorners = corners.filter(corner => corner.interiorAngle === 90)

        expect(reflexCorners).toHaveLength(1)
        expect(rightAngleCorners).toHaveLength(5)
      })

      it('should compute inside and outside points correctly for reflex corners', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createLShapedBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // All corners should have valid geometry
        corners.forEach(corner => {
          expect(corner.insidePoint).toBeDefined()
          expect(corner.outsidePoint).toBeDefined()
          expect(corner.interiorAngle).toBeGreaterThan(0)
          expect(corner.interiorAngle).toBeLessThanOrEqual(360)
        })
      })
    })

    describe('Angle Sum Property', () => {
      it('should have interior angles that match polygon angle sum formula', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()

        // Test with different polygons
        const testCases = [
          { boundary: createTriangularBoundary(), expectedSum: 180 },
          { boundary: createRectangularBoundary(), expectedSum: 360 },
          { boundary: createLShapedBoundary(), expectedSum: 720 } // 6 sides
        ]

        testCases.forEach(({ boundary, expectedSum }) => {
          const wallAssemblyId = createWallAssemblyId()
          const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
          const corners = slice.actions.getPerimeterCornersById(perimeter.id)

          const sumInteriorAngles = corners.reduce((sum, corner) => sum + corner.interiorAngle, 0)

          // Allow small rounding error
          expect(Math.abs(sumInteriorAngles - expectedSum)).toBeLessThan(10)
        })
      })
    })
  })

  describe('Wall Geometry', () => {
    describe('Wall Lines and Lengths', () => {
      it('should compute inside and outside lines for walls', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)

        walls.forEach(wall => {
          expect(wall.insideLine).toBeDefined()
          expect(wall.outsideLine).toBeDefined()
          expect(wall.insideLine.start).toBeDefined()
          expect(wall.insideLine.end).toBeDefined()
          expect(wall.outsideLine.start).toBeDefined()
          expect(wall.outsideLine.end).toBeDefined()
        })
      })

      it('should compute correct inside length', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)

        // First wall (left) should be ~5000 units
        expect(walls[0].wallLength).toBeCloseTo(5000)

        // Second wall (top) should be ~10000 units
        expect(walls[1].wallLength).toBeCloseTo(10000)
      })

      it('should compute wall length (between corner intersections)', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)

        walls.forEach(wall => {
          expect(wall.wallLength).toBeGreaterThan(0)
          expect(wall.wallLength).toBeLessThanOrEqual(wall.wallLength)
        })
      })

      it('should compute direction vectors', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)

        walls.forEach(wall => {
          expect(wall.direction).toBeDefined()
          expect(wall.outsideDirection).toBeDefined()

          // Direction vectors should be normalized
          const dirLength = Math.sqrt(wall.direction[0] ** 2 + wall.direction[1] ** 2)
          expect(Math.abs(dirLength - 1)).toBeLessThan(0.01)

          const outsideDirLength = Math.sqrt(wall.outsideDirection[0] ** 2 + wall.outsideDirection[1] ** 2)
          expect(Math.abs(outsideDirLength - 1)).toBeLessThan(0.01)

          // Outside direction should be perpendicular to wall direction
          const dotProduct = wall.direction[0] * wall.outsideDirection[0] + wall.direction[1] * wall.outsideDirection[1]
          expect(Math.abs(dotProduct)).toBeLessThan(0.01)
        })
      })
    })

    describe('Wall Polygons', () => {
      it('should compute wall polygon with 4 points', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const walls = slice.actions.getPerimeterWallsById(perimeter.id)

        walls.forEach(wall => {
          expect(wall.polygon).toBeDefined()
          expect(wall.polygon.points).toHaveLength(4)

          // All points should be valid
          wall.polygon.points.forEach(point => {
            expect(point[0]).toBeTypeOf('number')
            expect(point[1]).toBeTypeOf('number')
          })
        })
      })
    })

    describe('Thickness Changes', () => {
      it('should recalculate wall geometry when thickness changes', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]
        const neighbourId = perimeter.wallIds[1]
        const neighbourWall = slice.actions.getPerimeterWallById(neighbourId)
        const originalOutsideLength = neighbourWall.outsideLength

        slice.actions.updatePerimeterWallThickness(wallId, 600)

        const updatedWall = slice.actions.getPerimeterWallById(neighbourId)
        expect(updatedWall.outsideLength).not.toBe(originalOutsideLength)
        expect(updatedWall.thickness).toBe(neighbourWall.thickness)
      })
    })
  })

  describe('Perimeter Geometry', () => {
    describe('Reference Side', () => {
      it('should compute geometry with inside reference side', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        expect(perimeter.referenceSide).toBe('inside')

        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // Inside points should match boundary points
        expect(corners[0].insidePoint).toEqual(boundary.points[0])
        expect(corners[1].insidePoint).toEqual(boundary.points[1])
        expect(corners[2].insidePoint).toEqual(boundary.points[2])
        expect(corners[3].insidePoint).toEqual(boundary.points[3])
      })

      it('should compute geometry with outside reference side', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()
        const thickness = 420

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, thickness)

        slice.actions.setPerimeterReferenceSide(perimeter.id, 'outside')

        const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
        expect(updatedPerimeter.referenceSide).toBe('outside')

        const corners = slice.actions.getPerimeterCornersById(perimeter.id)

        // Outside points should now match original boundary points
        corners.forEach(corner => {
          expect(corner.outsidePoint).toBeDefined()
          expect(corner.insidePoint).toBeDefined()

          // Inside should be offset from outside
          expect(corner.insidePoint).not.toEqual(corner.outsidePoint)
        })
      })

      it('should recalculate all geometry when switching reference side', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const originalCorners = slice.actions.getPerimeterCornersById(perimeter.id).map(c => ({ ...c }))

        slice.actions.setPerimeterReferenceSide(perimeter.id, 'outside')

        const updatedCorners = slice.actions.getPerimeterCornersById(perimeter.id)

        // Geometry should have changed
        updatedCorners.forEach((corner, i) => {
          expect(corner.referencePoint).toEqual(originalCorners[i].outsidePoint)
        })
      })
    })

    describe('Inner and Outer Polygons', () => {
      it('should create inner and outer perimeter polygons', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

        const geometry = slice._perimeterGeometry[perimeter.id]
        expect(geometry).toBeDefined()
        expect(geometry.innerPolygon).toBeDefined()
        expect(geometry.outerPolygon).toBeDefined()
        expect(geometry.innerPolygon.points).toHaveLength(4)
        expect(geometry.outerPolygon.points).toHaveLength(4)
      })
    })
  })

  describe('Entity Geometry (Openings and Posts)', () => {
    describe('Opening Positioning', () => {
      it('should position opening correctly on wall', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]

        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })!

        expect(opening.polygon).toBeDefined()
        expect(opening.polygon.points).toHaveLength(4)
        expect(opening.center).toBeDefined()
      })

      it('should create entity polygon with correct dimensions', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]
        const width = 900

        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width,
          height: 2100
        })!

        const insideStart = opening.insideLine.start
        const insideEnd = opening.insideLine.end

        // Distance between inside start and end should match width
        const actualWidth = Math.sqrt((insideEnd[0] - insideStart[0]) ** 2 + (insideEnd[1] - insideStart[1]) ** 2)
        expect(Math.abs(actualWidth - width)).toBeLessThan(1)
      })

      it('should update entity geometry when wall geometry changes', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary()
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]

        const originalOpening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 2000,
          width: 900,
          height: 2100
        })!

        const originalPolygon = { ...originalOpening.polygon }

        // Change wall thickness
        slice.actions.updatePerimeterWallThickness(wallId, 600)

        const updatedOpening = slice.actions.getWallOpeningById(originalOpening.id)

        // Polygon should have changed
        expect(updatedOpening.polygon).not.toEqual(originalPolygon)
      })
    })

    describe('Post Positioning', () => {
      it('should position post correctly on wall', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]

        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width: 100
          })
        )!

        expect(post.polygon).toBeDefined()
        expect(post.polygon.points).toHaveLength(4)
        expect(post.center).toBeDefined()
      })

      it('should create post polygon with correct width', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]
        const width = 100

        const post = slice.actions.addWallPost(
          wallId,
          mockPost({
            centerOffsetFromWallStart: 2000,
            width
          })
        )!

        const insideStart = post.insideLine.start
        const insideEnd = post.insideLine.end

        // Distance between inside start and end should match width
        const actualWidth = Math.sqrt((insideEnd[0] - insideStart[0]) ** 2 + (insideEnd[1] - insideStart[1]) ** 2)
        expect(Math.abs(actualWidth - width)).toBeLessThan(1)
      })
    })

    describe('Entity Geometry Edge Cases', () => {
      it('should handle entity at start of wall', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]

        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: 500,
          width: 900,
          height: 2100
        })!

        expect(opening.polygon).toBeDefined()
        expect(opening.polygon.points).toHaveLength(4)
      })

      it('should handle entity at end of wall', () => {
        const { slice } = setupPerimeterSlice()
        const testStoreyId = createStoreyId()
        const boundary = createRectangularBoundary(10000, 5000)
        const wallAssemblyId = createWallAssemblyId()

        const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
        const wallId = perimeter.wallIds[0]
        const wall = slice.actions.getPerimeterWallById(wallId)

        const opening = slice.actions.addWallOpening(wallId, {
          openingType: 'door',
          centerOffsetFromWallStart: wall.wallLength - 500,
          width: 900,
          height: 2100
        })!

        expect(opening.polygon).toBeDefined()
        expect(opening.polygon.points).toHaveLength(4)
      })
    })

    describe('updateEntityGeometry function', () => {
      it('should calculate entity geometry from wall geometry', () => {
        // Create mock wall geometry
        const wallGeometry: PerimeterWallGeometry = {
          insideLine: {
            start: newVec2(0, 0),
            end: newVec2(10000, 0)
          },
          outsideLine: {
            start: newVec2(0, -420),
            end: newVec2(10000, -420)
          },
          insideLength: 10000,
          outsideLength: 10000,
          wallLength: 10000,
          direction: newVec2(1, 0),
          outsideDirection: newVec2(0, -1),
          polygon: { points: [] }
        }

        const entity = {
          centerOffsetFromWallStart: 2000,
          width: 900
        } as any

        const geometry = updateEntityGeometry(wallGeometry, entity)

        expect(geometry.polygon).toBeDefined()
        expect(geometry.polygon.points).toHaveLength(4)
        expect(geometry.center).toBeDefined()
        expect(geometry.insideLine).toBeDefined()
        expect(geometry.outsideLine).toBeDefined()

        // Check that center is roughly at expected position
        const expectedCenterX = 2000
        expect(Math.abs(geometry.center[0] - expectedCenterX)).toBeLessThan(1)
      })
    })
  })

  describe('Geometry Consistency', () => {
    it('should maintain consistent geometry after multiple operations', () => {
      const { slice } = setupPerimeterSlice()
      const testStoreyId = createStoreyId()
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)

      // Add opening
      const wallId = perimeter.wallIds[0]
      slice.actions.addWallOpening(wallId, {
        openingType: 'door',
        centerOffsetFromWallStart: 2000,
        width: 900,
        height: 2100
      })

      // Change thickness
      slice.actions.updatePerimeterWallThickness(wallId, 600)

      // Split wall
      const wall = slice.actions.getPerimeterWallById(wallId)
      slice.actions.splitPerimeterWall(wallId, wall.wallLength / 2)

      // Verify all geometry still exists and is valid
      const updatedPerimeter = slice.actions.getPerimeterById(perimeter.id)
      const corners = slice.actions.getPerimeterCornersById(updatedPerimeter.id)
      const walls = slice.actions.getPerimeterWallsById(updatedPerimeter.id)

      corners.forEach(corner => {
        expect(corner.insidePoint).toBeDefined()
        expect(corner.outsidePoint).toBeDefined()
        expect(corner.interiorAngle).toBeGreaterThan(0)
      })

      walls.forEach(wall => {
        expect(wall.insideLine).toBeDefined()
        expect(wall.outsideLine).toBeDefined()
        expect(wall.polygon).toBeDefined()
        expect(wall.polygon.points).toHaveLength(4)
      })
    })

    it('should have matching corner and wall endpoints', () => {
      const { slice } = setupPerimeterSlice()
      const testStoreyId = createStoreyId()
      const boundary = createRectangularBoundary()
      const wallAssemblyId = createWallAssemblyId()

      const perimeter = slice.actions.addPerimeter(testStoreyId, boundary, wallAssemblyId, 420)
      const walls = slice.actions.getPerimeterWallsById(perimeter.id)

      walls.forEach(wall => {
        const startCorner = slice.actions.getPerimeterCornerById(wall.startCornerId)
        const endCorner = slice.actions.getPerimeterCornerById(wall.endCornerId)

        expect(
          eqVec2(startCorner.insidePoint, wall.insideLine.start) ||
            eqVec2(startCorner.outsidePoint, wall.outsideLine.start)
        ).toBeTruthy()
        expect(
          eqVec2(endCorner.insidePoint, wall.insideLine.end) || eqVec2(endCorner.outsidePoint, wall.outsideLine.end)
        ).toBeTruthy()
      })
    })
  })
})
