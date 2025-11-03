import { vec2 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId, StoreyId, WallAssemblyId } from '@/building/model/ids'
import { type LineSegment2D, direction, lineIntersection, perpendicularCCW } from '@/shared/geometry'

import { getConfigActions } from './config'
import { computeFloorConstructionPolygon } from './perimeter'

vi.mock('./config', () => ({
  getConfigActions: vi.fn()
}))

const mockedGetWallAssemblyById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getWallAssemblyById: mockedGetWallAssemblyById
} as any)

describe('computeFloorConstructionPolygon', () => {
  it('offsets each wall by its outside layer thickness', () => {
    const insidePoints = [
      vec2.fromValues(0, 0),
      vec2.fromValues(0, 3000),
      vec2.fromValues(4000, 3000),
      vec2.fromValues(4000, 0)
    ]

    const wallThicknesses = [400, 450, 480, 420]
    const outsideLayerThicknesses = [150, 210, 250, 100]

    // x1: 0 - 400 + 150 = -250
    // x2: 4000 + 480 - 250 = 4230
    // y1: 0 - 420 + 100 = -320
    // y2: 3000 + 450 - 210 = 3240
    const expectedPoints = [
      vec2.fromValues(-250, -320),
      vec2.fromValues(-250, 3240),
      vec2.fromValues(4230, 3240),
      vec2.fromValues(4230, -320)
    ]

    const walls: PerimeterWall[] = insidePoints.map((insideStart, index) => {
      const nextIndex = (index + 1) % insidePoints.length
      const insideEnd = insidePoints[nextIndex]
      const wallDirection = direction(insideStart, insideEnd)
      const outsideDirection = perpendicularCCW(wallDirection)
      const thickness = wallThicknesses[index]
      const insideLine: LineSegment2D = { start: insideStart, end: insideEnd }
      const outsideLineStart = vec2.scaleAndAdd(vec2.create(), insideStart, outsideDirection, thickness)
      const outsideLineEnd = vec2.scaleAndAdd(vec2.create(), insideEnd, outsideDirection, thickness)
      const outsideLine: LineSegment2D = { start: outsideLineStart, end: outsideLineEnd }
      return {
        id: `wall-${index}` as PerimeterWallId,
        thickness,
        wallAssemblyId: `assembly-${index}` as WallAssemblyId,
        openings: [],
        insideLength: vec2.distance(insideStart, insideEnd),
        outsideLength: vec2.distance(outsideLineStart, outsideLineEnd),
        wallLength: vec2.distance(insideStart, insideEnd),
        insideLine,
        outsideLine,
        direction: wallDirection,
        outsideDirection
      }
    })

    const outsideLines = walls.map(wall => ({
      point: wall.outsideLine.start,
      direction: wall.direction
    }))

    const corners: PerimeterCorner[] = insidePoints.map((insidePoint, index) => {
      const prevIndex = (index - 1 + insidePoints.length) % insidePoints.length
      const prevLine = outsideLines[prevIndex]
      const currentLine = outsideLines[index]
      const outsideIntersection = lineIntersection(prevLine, currentLine)
      const outsidePoint =
        outsideIntersection ??
        vec2.scaleAndAdd(vec2.create(), insidePoint, walls[index].outsideDirection, walls[index].thickness)

      return {
        id: `corner-${index}` as PerimeterCornerId,
        insidePoint,
        outsidePoint,
        constructedByWall: 'next',
        interiorAngle: 90,
        exteriorAngle: 270
      }
    })

    const perimeter: Perimeter = {
      id: 'perimeter-1' as PerimeterId,
      storeyId: 'storey-1' as StoreyId,
      referenceSide: 'inside',
      referencePolygon: insidePoints.map(point => vec2.clone(point)),
      walls,
      corners,
      baseRingBeamAssemblyId: undefined,
      topRingBeamAssemblyId: undefined
    }

    const outsideThicknessByAssembly = new Map<WallAssemblyId, number>()
    outsideLayerThicknesses.forEach((value, index) => {
      outsideThicknessByAssembly.set(walls[index].wallAssemblyId, value)
    })

    mockedGetWallAssemblyById.mockImplementation((id: WallAssemblyId) => {
      const outsideThickness = outsideThicknessByAssembly.get(id)
      if (outsideThickness == null) {
        return null
      }
      return {
        layers: {
          insideThickness: 0,
          outsideThickness
        }
      } as any
    })

    const polygon = computeFloorConstructionPolygon(perimeter)

    expect(polygon.points).toEqual(expectedPoints)
  })
})
