import { vec2 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId, StoreyId, WallAssemblyId } from '@/building/model/ids'
import { getConfigActions } from '@/construction/config'
import { applyWallFaceOffsets, createWallFaceOffsets } from '@/construction/storey'
import { direction, perpendicular } from '@/shared/geometry'

vi.mock('./config', () => ({
  getConfigActions: vi.fn()
}))

const mockedGetWallAssemblyById = vi.fn()

vi.mocked(getConfigActions).mockReturnValue({
  getWallAssemblyById: mockedGetWallAssemblyById
} as any)

function createRectangularPerimeter(width: number, height: number, wallThickness: number): Perimeter {
  const insideCorners = [
    vec2.fromValues(0, 0),
    vec2.fromValues(0, height),
    vec2.fromValues(width, height),
    vec2.fromValues(width, 0)
  ]

  const outsideCorners = [
    vec2.fromValues(-wallThickness, -wallThickness),
    vec2.fromValues(-wallThickness, height + wallThickness),
    vec2.fromValues(width + wallThickness, height + wallThickness),
    vec2.fromValues(width + wallThickness, -wallThickness)
  ]

  const walls: PerimeterWall[] = insideCorners.map((start, index) => {
    const end = insideCorners[(index + 1) % insideCorners.length]
    const dir = direction(start, end)
    const outsideDirection = perpendicular(dir)
    const insideLine = { start, end }
    const outsideStart = vec2.scaleAndAdd(vec2.create(), start, outsideDirection, wallThickness)
    const outsideEnd = vec2.scaleAndAdd(vec2.create(), end, outsideDirection, wallThickness)
    const outsideLine = { start: outsideStart, end: outsideEnd }

    return {
      id: `wall-${index}` as PerimeterWallId,
      thickness: wallThickness,
      wallAssemblyId: `assembly-${index}` as WallAssemblyId,
      openings: [],
      insideLength: vec2.distance(start, end),
      outsideLength: vec2.distance(outsideStart, outsideEnd),
      wallLength: vec2.distance(start, end),
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
    referencePolygon: insideCorners.map(point => vec2.clone(point)),
    walls,
    corners,
    baseRingBeamAssemblyId: undefined,
    topRingBeamAssemblyId: undefined
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
      points: [vec2.fromValues(0, 0), vec2.fromValues(0, 3000), vec2.fromValues(4000, 3000), vec2.fromValues(4000, 0)]
    }

    const adjusted = applyWallFaceOffsets(area, faces)

    const expected = [
      vec2.fromValues(-insideThickness, -insideThickness),
      vec2.fromValues(-insideThickness, 3000 + insideThickness),
      vec2.fromValues(4000 + insideThickness, 3000 + insideThickness),
      vec2.fromValues(4000 + insideThickness, -insideThickness)
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
      points: [vec2.fromValues(0, 0), vec2.fromValues(500, 0), vec2.fromValues(500, 500), vec2.fromValues(0, 500)]
    }

    const adjusted = applyWallFaceOffsets(opening, faces)

    const expected = [
      vec2.fromValues(-insideThickness, -insideThickness),
      vec2.fromValues(500, -insideThickness),
      vec2.fromValues(500, 500),
      vec2.fromValues(-insideThickness, 500)
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
      points: [
        vec2.fromValues(0, 3100),
        vec2.fromValues(0, 3500),
        vec2.fromValues(400, 3500),
        vec2.fromValues(400, 3100)
      ]
    }

    const adjusted = applyWallFaceOffsets(area, faces)

    expect(adjusted.points).toHaveLength(area.points.length)
    adjusted.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(area.points[index][0], 6)
      expect(point[1]).toBeCloseTo(area.points[index][1], 6)
    })
  })
})
