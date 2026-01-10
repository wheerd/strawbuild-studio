import { describe, expect, it, vi } from 'vitest'

import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry, PerimeterWithGeometry } from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId, StoreyId, WallAssemblyId } from '@/building/model/ids'
import { type StoreActions, getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import {
  type LineSegment2D,
  direction,
  distVec2,
  lineIntersection,
  newVec2,
  perpendicularCCW,
  scaleAddVec2
} from '@/shared/geometry'
import { partial, partialMock } from '@/test/helpers'

import { computePerimeterConstructionPolygon } from './context'

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

const mockedGetWallAssemblyById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getWallAssemblyById: mockedGetWallAssemblyById
} as any)

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

const mockedGetPerimeterCornerById = vi.fn()
const mockedGetPerimeterWallById = vi.fn()

vi.mocked(getModelActions).mockReturnValue(
  partialMock<StoreActions>({
    getPerimeterWallById: mockedGetPerimeterWallById,
    getPerimeterCornerById: mockedGetPerimeterCornerById
  })
)

describe('computePerimeterConstructionPolygon', () => {
  it('offsets each wall by its outside layer thickness', () => {
    const insidePoints = [newVec2(0, 0), newVec2(0, 3000), newVec2(4000, 3000), newVec2(4000, 0)]

    const wallThicknesses = [400, 450, 480, 420]
    const outsideLayerThicknesses = [150, 210, 250, 100]

    // x1: 0 - 400 + 150 = -250
    // x2: 4000 + 480 - 250 = 4230
    // y1: 0 - 420 + 100 = -320
    // y2: 3000 + 450 - 210 = 3240
    const expectedPoints = [newVec2(-250, -320), newVec2(-250, 3240), newVec2(4230, 3240), newVec2(4230, -320)]

    const walls = insidePoints.map((insideStart, index) => {
      const nextIndex = (index + 1) % insidePoints.length
      const insideEnd = insidePoints[nextIndex]
      const wallDirection = direction(insideStart, insideEnd)
      const outsideDirection = perpendicularCCW(wallDirection)
      const thickness = wallThicknesses[index]
      const insideLine: LineSegment2D = { start: insideStart, end: insideEnd }
      const outsideLineStart = scaleAddVec2(insideStart, outsideDirection, thickness)
      const outsideLineEnd = scaleAddVec2(insideEnd, outsideDirection, thickness)
      const outsideLine: LineSegment2D = { start: outsideLineStart, end: outsideLineEnd }
      return partial<PerimeterWallWithGeometry>({
        id: `wall-${index}` as PerimeterWallId,
        thickness,
        wallAssemblyId: `assembly-${index}` as WallAssemblyId,
        insideLength: distVec2(insideStart, insideEnd),
        outsideLength: distVec2(outsideLineStart, outsideLineEnd),
        wallLength: distVec2(insideStart, insideEnd),
        insideLine,
        outsideLine,
        direction: wallDirection,
        outsideDirection
      })
    })
    mockedGetPerimeterWallById.mockImplementation(id => walls.find(w => w.id === id))

    const outsideLines = walls.map(wall => ({
      point: wall.outsideLine.start,
      direction: wall.direction
    }))

    const corners = insidePoints.map((insidePoint, index) => {
      const prevIndex = (index - 1 + insidePoints.length) % insidePoints.length
      const prevLine = outsideLines[prevIndex]
      const currentLine = outsideLines[index]
      const outsideIntersection = lineIntersection(prevLine, currentLine)
      const outsidePoint =
        outsideIntersection ?? scaleAddVec2(insidePoint, walls[index].outsideDirection, walls[index].thickness)

      return partial<PerimeterCornerWithGeometry>({
        id: `corner-${index}` as PerimeterCornerId,
        insidePoint,
        outsidePoint,
        constructedByWall: 'next'
      })
    })
    mockedGetPerimeterCornerById.mockImplementation(id => corners.find(c => c.id === id))

    const perimeter = partial<PerimeterWithGeometry>({
      id: 'perimeter-1' as PerimeterId,
      storeyId: 'storey-1' as StoreyId,
      referenceSide: 'inside',
      wallIds: walls.map(w => w.id),
      cornerIds: corners.map(c => c.id)
    })

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

    const result = computePerimeterConstructionPolygon(perimeter)

    expect(result.polygon.points).toEqual(expectedPoints)
  })
})
