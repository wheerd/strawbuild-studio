import { vec2 } from 'gl-matrix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { type ConstructionElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { ExtrudedPolygon } from '@/construction/shapes'
import type { Polygon2D } from '@/shared/geometry'
import * as geometry from '@/shared/geometry'

import { type FullRingBeamConfig, constructFullRingBeam, constructRingBeam, validateRingBeamConfig } from './ringBeams'

vi.mock('@/shared/geometry', async () => {
  const original = await vi.importActual<typeof import('@/shared/geometry')>('@/shared/geometry')
  return {
    ...original,
    simplifyPolygon: vi.fn(),
    offsetPolygon: vi.fn()
  }
})

const simplifyPolygonMock = vi.mocked(geometry.simplifyPolygon)
const offsetPolygonMock = vi.mocked(geometry.offsetPolygon)

function createMockCorner(id: string, insidePoint: vec2, constructedByWall: 'previous' | 'next'): PerimeterCorner {
  return {
    id: id as any,
    insidePoint,
    outsidePoint: insidePoint,
    constructedByWall,
    interiorAngle: 90,
    exteriorAngle: 270
  }
}

function createMockPerimeter(corners: PerimeterCorner[]): Perimeter {
  return {
    id: 'perimeter-1' as PerimeterId,
    storeyId: 'storey-1' as any,
    walls: [],
    corners
  }
}

const material: MaterialId = 'material-1' as MaterialId

const defaultConfig: FullRingBeamConfig = {
  type: 'full',
  height: 60,
  width: 360,
  offsetFromEdge: 100,
  material
}

beforeEach(() => {
  simplifyPolygonMock.mockImplementation((polygon: Polygon2D) => polygon)
  offsetPolygonMock.mockImplementation((polygon: Polygon2D, distance: number) => ({
    points: polygon.points.map(point => vec2.fromValues(point[0] + distance, point[1] + distance))
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('constructFullRingBeam', () => {
  it('constructs extruded polygons for each segment using simplified and offset polygons', () => {
    const corners = [
      createMockCorner('c1', vec2.fromValues(0, 0), 'next'),
      createMockCorner('c2', vec2.fromValues(0, 3000), 'next'),
      createMockCorner('c3', vec2.fromValues(4000, 3000), 'next'),
      createMockCorner('c4', vec2.fromValues(4000, 0), 'next')
    ]
    const perimeter = createMockPerimeter(corners)

    const result = constructFullRingBeam(perimeter, defaultConfig)

    const expectedPolygon: Polygon2D = { points: corners.map(corner => corner.insidePoint) }
    expect(simplifyPolygonMock).toHaveBeenCalledWith(expectedPolygon)
    expect(offsetPolygonMock).toHaveBeenNthCalledWith(1, expectedPolygon, defaultConfig.offsetFromEdge)
    expect(offsetPolygonMock).toHaveBeenNthCalledWith(
      2,
      expectedPolygon,
      defaultConfig.offsetFromEdge + defaultConfig.width
    )

    expect(result.elements).toHaveLength(corners.length)
    result.elements.forEach(element => {
      expect('material' in element).toBe(true)
      const ce = element as ConstructionElement
      expect(ce.material).toBe(defaultConfig.material)
      expect(ce.shape.type).toBe('polygon')
      const shape = ce.shape as ExtrudedPolygon
      expect(shape.polygon.outer.points).toHaveLength(4)
      expect(shape.plane).toBe('xy')
      expect(shape.thickness).toBe(defaultConfig.height)
    })
  })

  it('passes through offset distance variations to geometry helpers', () => {
    const corners = [
      createMockCorner('c1', vec2.fromValues(0, 0), 'next'),
      createMockCorner('c2', vec2.fromValues(0, 1000), 'next'),
      createMockCorner('c3', vec2.fromValues(1000, 1000), 'next'),
      createMockCorner('c4', vec2.fromValues(1000, 0), 'next')
    ]
    const perimeter = createMockPerimeter(corners)

    const config: FullRingBeamConfig = {
      ...defaultConfig,
      offsetFromEdge: 50,
      width: 240
    }

    constructFullRingBeam(perimeter, config)

    const expectedPolygon: Polygon2D = { points: corners.map(corner => corner.insidePoint) }
    expect(offsetPolygonMock).toHaveBeenNthCalledWith(1, expectedPolygon, config.offsetFromEdge)
    expect(offsetPolygonMock).toHaveBeenNthCalledWith(2, expectedPolygon, config.offsetFromEdge + config.width)
  })
})

describe('constructRingBeam', () => {
  it('delegates full ring beam construction', () => {
    const corners = [
      createMockCorner('c1', vec2.fromValues(0, 0), 'next'),
      createMockCorner('c2', vec2.fromValues(0, 1000), 'next'),
      createMockCorner('c3', vec2.fromValues(1000, 1000), 'next'),
      createMockCorner('c4', vec2.fromValues(1000, 0), 'next')
    ]
    const perimeter = createMockPerimeter(corners)

    const result = constructRingBeam(perimeter, defaultConfig)

    expect(result.elements).toHaveLength(corners.length)
  })

  it('returns unsupported model for double ring beam', () => {
    const corners = [
      createMockCorner('c1', vec2.fromValues(0, 0), 'next'),
      createMockCorner('c2', vec2.fromValues(0, 1000), 'next'),
      createMockCorner('c3', vec2.fromValues(1000, 1000), 'next'),
      createMockCorner('c4', vec2.fromValues(1000, 0), 'next')
    ]
    const perimeter = createMockPerimeter(corners)

    const result = constructRingBeam(perimeter, {
      type: 'double',
      height: 60,
      thickness: 120,
      spacing: 50,
      offsetFromEdge: 100,
      material,
      infillMaterial: 'inf' as MaterialId
    })

    expect(result.warnings).toHaveLength(1)
    expect(result.elements).toHaveLength(0)
  })
})

describe('validateRingBeamConfig', () => {
  it('throws for invalid full config', () => {
    expect(() =>
      validateRingBeamConfig({
        ...defaultConfig,
        width: 0
      })
    ).toThrow('Ring beam width must be greater than 0')
  })

  it('throws for invalid double config', () => {
    expect(() =>
      validateRingBeamConfig({
        type: 'double',
        height: 60,
        thickness: 0,
        spacing: 50,
        offsetFromEdge: 10,
        material,
        infillMaterial: material
      })
    ).toThrow('Ring beam thickness must be greater than 0')
  })
})
