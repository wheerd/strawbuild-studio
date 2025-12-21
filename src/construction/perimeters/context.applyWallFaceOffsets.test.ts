import { describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId, StoreyId, WallAssemblyId } from '@/building/model/ids'
import { getConfigActions } from '@/construction/config'
import { copyVec2, direction, distVec2, newVec2, perpendicular, scaleAddVec2 } from '@/shared/geometry'

import { applyWallFaceOffsets, createWallFaceOffsets } from './context'

vi.mock('@/construction/config', () => ({
  getConfigActions: vi.fn()
}))

const mockedGetWallAssemblyById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getWallAssemblyById: mockedGetWallAssemblyById
} as any)

function createRectangularPerimeter(width: number, height: number, wallThickness: number): Perimeter {
  const insideCorners = [newVec2(0, 0), newVec2(0, height), newVec2(width, height), newVec2(width, 0)]

  const outsideCorners = [
    newVec2(-wallThickness, -wallThickness),
    newVec2(-wallThickness, height + wallThickness),
    newVec2(width + wallThickness, height + wallThickness),
    newVec2(width + wallThickness, -wallThickness)
  ]

  const walls: PerimeterWall[] = insideCorners.map((start, index) => {
    const end = insideCorners[(index + 1) % insideCorners.length]
    const dir = direction(start, end)
    const outsideDirection = perpendicular(dir)
    const insideLine = { start, end }
    const outsideStart = scaleAddVec2(start, outsideDirection, wallThickness)
    const outsideEnd = scaleAddVec2(end, outsideDirection, wallThickness)
    const outsideLine = { start: outsideStart, end: outsideEnd }

    return {
      id: `wall-${index}` as PerimeterWallId,
      thickness: wallThickness,
      wallAssemblyId: `assembly-${index}` as WallAssemblyId,
      openings: [],
      posts: [],
      insideLength: distVec2(start, end),
      outsideLength: distVec2(outsideStart, outsideEnd),
      wallLength: distVec2(start, end),
      insideLine,
      outsideLine,
      direction: dir,
      outsideDirection
    }
  })

  const corners: PerimeterCorner[] = insideCorners.map((point, index) => ({
    id: `corner-${index}` as PerimeterCornerId,
    insidePoint: point,
    outsidePoint: outsideCorners[index],
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270
  }))

  return {
    id: 'perimeter-1' as PerimeterId,
    storeyId: 'storey-1' as StoreyId,
    referenceSide: 'inside',
    referencePolygon: insideCorners.map(point => copyVec2(point)),
    walls,
    corners
  }
}

describe('applyWallFaceOffsets', () => {
  const insideThickness = 50
  const outsideThickness = 100

  beforeEach(() => {
    mockedGetWallAssemblyById.mockReset()
    mockedGetWallAssemblyById.mockReturnValue({
      layers: { insideThickness, insideLayers: [], outsideThickness, outsideLayers: [] }
    } as any)
  })

  it('shrinks clockwise floor areas along matching inside faces', () => {
    const perimeter = createRectangularPerimeter(4000, 3000, 400)
    const faces = createWallFaceOffsets([perimeter])

    const area = {
      points: [newVec2(0, 0), newVec2(0, 3000), newVec2(4000, 3000), newVec2(4000, 0)]
    }

    const adjusted = applyWallFaceOffsets(area, faces)

    const expected = [
      newVec2(-insideThickness, -insideThickness),
      newVec2(-insideThickness, 3000 + insideThickness),
      newVec2(4000 + insideThickness, 3000 + insideThickness),
      newVec2(4000 + insideThickness, -insideThickness)
    ]

    expect(adjusted.points).toHaveLength(expected.length)
    adjusted.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('shrinks counter-clockwise openings along matching faces', () => {
    const perimeter = createRectangularPerimeter(4000, 3000, 400)
    const faces = createWallFaceOffsets([perimeter])

    const opening = {
      points: [newVec2(0, 0), newVec2(500, 0), newVec2(500, 500), newVec2(0, 500)]
    }

    const adjusted = applyWallFaceOffsets(opening, faces)

    const expected = [
      newVec2(-insideThickness, -insideThickness),
      newVec2(500, -insideThickness),
      newVec2(500, 500),
      newVec2(-insideThickness, 500)
    ]

    expect(adjusted.points).toHaveLength(expected.length)
    adjusted.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('does not offset edges that are colinear but not touching the wall face', () => {
    const perimeter = createRectangularPerimeter(4000, 3000, 400)
    const faces = createWallFaceOffsets([perimeter])

    const area = {
      points: [newVec2(0, 3100), newVec2(0, 3500), newVec2(400, 3500), newVec2(400, 3100)]
    }

    const adjusted = applyWallFaceOffsets(area, faces)

    expect(adjusted.points).toHaveLength(area.points.length)
    adjusted.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(area.points[index][0], 6)
      expect(point[1]).toBeCloseTo(area.points[index][1], 6)
    })
  })
})
