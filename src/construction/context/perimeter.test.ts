import { describe, expect, it, vi } from 'vitest'

import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry, PerimeterWithGeometry } from '@/building/model'
import type {
  LayerSetId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallAssemblyId,
  PerimeterWallId,
  StoreyId
} from '@/building/model/ids'
import { type StoreActions, getModelActions } from '@/building/store'
import { getConfigActions } from '@/config/store'
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

import { computePerimeterConstructionPolygon } from './perimeter'

const outsideThicknessByLayerSetId = new Map<LayerSetId, number>()

vi.mock('@/config/store', () => ({
  getConfigActions: vi.fn(),
  resolveLayerSetThickness: (id: LayerSetId | undefined) => {
    if (!id) return 0
    return outsideThicknessByLayerSetId.get(id) ?? 0
  }
}))

const mockedGetWallAssemblyById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getPerimeterWallAssemblyById: mockedGetWallAssemblyById
} as any)

vi.mock('@/building/store', () => ({
  getModelActions: vi.fn()
}))

const mockedGetPerimeterWallById = vi.fn()
const mockedGetPerimeterCornerById = vi.fn()

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
        wallAssemblyId: `assembly-${index}` as PerimeterWallAssemblyId,
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

    const outsideThicknessByAssembly = new Map<PerimeterWallAssemblyId, number>()
    outsideLayerThicknesses.forEach((value, index) => {
      outsideThicknessByAssembly.set(walls[index].wallAssemblyId, value)
    })

    outsideThicknessByLayerSetId.clear()

    mockedGetWallAssemblyById.mockImplementation((id: PerimeterWallAssemblyId) => {
      const outsideThickness = outsideThicknessByAssembly.get(id)
      if (outsideThickness == null) {
        return null
      }
      const outsideLayerSetId = `ls-${id}` as LayerSetId
      outsideThicknessByLayerSetId.set(outsideLayerSetId, outsideThickness)
      return {
        outsideLayerSetId
      } as any
    })

    const result = computePerimeterConstructionPolygon(perimeter)

    expect(result.polygon.points).toEqual(expectedPoints)
  })

  it('keeps retained construction lines associated with their wall IDs', () => {
    const walls = [
      { id: 'wall-0', point: newVec2(0, 0), direction: newVec2(1, 0) },
      { id: 'wall-1', point: newVec2(100, 0), direction: newVec2(1, 0) },
      { id: 'wall-2', point: newVec2(100, 0), direction: newVec2(0, 1) },
      { id: 'wall-3', point: newVec2(100, 100), direction: newVec2(-1, 0) },
      { id: 'wall-4', point: newVec2(0, 100), direction: newVec2(0, -1) }
    ].map(({ id, point, direction: wallDirection }) =>
      partial<PerimeterWallWithGeometry>({
        id: id as PerimeterWallId,
        wallAssemblyId: `assembly-${id}` as PerimeterWallAssemblyId,
        insideLine: { start: point, end: scaleAddVec2(point, wallDirection, 100) },
        outsideLine: { start: point, end: scaleAddVec2(point, wallDirection, 100) },
        direction: wallDirection,
        outsideDirection: perpendicularCCW(wallDirection)
      })
    )

    mockedGetPerimeterWallById.mockImplementation(id => walls.find(wall => wall.id === id))
    mockedGetWallAssemblyById.mockReturnValue(null)

    const result = computePerimeterConstructionPolygon(
      partial<PerimeterWithGeometry>({ wallIds: walls.map(wall => wall.id) })
    )

    expect(result.linesByWallId['wall-1' as PerimeterWallId]).toEqual({
      point: newVec2(100, 0),
      direction: newVec2(1, 0)
    })
    expect(result.linesByWallId['wall-2' as PerimeterWallId]).toEqual({
      point: newVec2(100, 0),
      direction: newVec2(0, 1)
    })
  })
})
