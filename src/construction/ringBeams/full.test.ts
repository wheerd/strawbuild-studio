import { vec2, vec3 } from 'gl-matrix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PerimeterId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { type ConstructionElement, type GroupOrElement } from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { HighlightedPolygon } from '@/construction/model'
import { type PartInfo, polygonPartInfo } from '@/construction/parts'
import type { ExtrudedShape } from '@/construction/shapes'
import { TAG_PERIMETER_INSIDE, TAG_PERIMETER_OUTSIDE } from '@/construction/tags'
import * as geometry from '@/shared/geometry'
import type { Polygon2D } from '@/shared/geometry'

import { FullRingBeamAssembly } from './full'
import type { FullRingBeamConfig } from './types'

vi.mock('@/construction/parts')

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
const polygonPartInfoMock = vi.mocked(polygonPartInfo)

const material: MaterialId = 'material-1' as MaterialId

const defaultConfig: FullRingBeamConfig = {
  type: 'full',
  height: 60,
  width: 360,
  offsetFromEdge: 100,
  material
}

let assembly: FullRingBeamAssembly

beforeEach(() => {
  assembly = new FullRingBeamAssembly()
  simplifyPolygonMock.mockImplementation((polygon: Polygon2D) => ({
    points: polygon.points.map(point => vec2.clone(point))
  }))
  offsetPolygonMock.mockImplementation((polygon: Polygon2D, distance: number) => ({
    points: polygon.points.map(point => vec2.fromValues(point[0] + distance, point[1] + distance))
  }))
  polygonPartInfoMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

function createMockCorner(
  id: string,
  insidePoint: vec2,
  outsidePoint: vec2 = insidePoint,
  constructedByWall: 'previous' | 'next' = 'next'
): PerimeterCorner {
  return {
    id: id as any,
    insidePoint,
    outsidePoint,
    constructedByWall,
    interiorAngle: 90,
    exteriorAngle: 270
  }
}

function createMockPerimeter(corners: PerimeterCorner[]): Perimeter {
  return {
    id: 'perimeter-1' as PerimeterId,
    storeyId: 'storey-1' as any,
    referenceSide: 'inside',
    referencePolygon: corners.map(corner => vec2.clone(corner.insidePoint)),
    walls: [],
    corners
  }
}

function assertConstructionElement(element: GroupOrElement): asserts element is ConstructionElement {
  if (!('material' in element)) {
    throw new Error('Expected construction element')
  }
}

describe('FullRingBeamAssembly', () => {
  describe('construct', () => {
    let corners: PerimeterCorner[]
    let perimeter: Perimeter
    let expectedInsidePolygon: Polygon2D
    const simplifiedPolygon = {
      points: [vec2.fromValues(1000, 1000), vec2.fromValues(2000, 2000), vec2.fromValues(3000, 0)]
    }
    beforeEach(() => {
      corners = [
        createMockCorner('c1', vec2.fromValues(0, 0)),
        createMockCorner('c2', vec2.fromValues(0, 3000)),
        createMockCorner('c3', vec2.fromValues(4000, 3000)),
        createMockCorner('c4', vec2.fromValues(4000, 0))
      ]
      perimeter = createMockPerimeter(corners)
      expectedInsidePolygon = { points: corners.map(corner => corner.insidePoint) }
      simplifyPolygonMock.mockReturnValue(simplifiedPolygon)
    })

    it('creates ring beam for simplified polygon', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      expect(simplifyPolygonMock).toHaveBeenCalledWith(expectedInsidePolygon)
      expect(offsetPolygonMock).toHaveBeenNthCalledWith(1, simplifiedPolygon, defaultConfig.offsetFromEdge)
      expect(offsetPolygonMock).toHaveBeenNthCalledWith(
        2,
        simplifiedPolygon,
        defaultConfig.offsetFromEdge + defaultConfig.width
      )

      expect(model.elements).toHaveLength(simplifiedPolygon.points.length)
    })

    it('creates extruded polygon elements', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      expect(model.elements).toHaveLength(simplifiedPolygon.points.length)
      model.elements.forEach(element => {
        assertConstructionElement(element)
        const constructionElement = element
        expect(constructionElement.material).toBe(defaultConfig.material)
        const shape = constructionElement.shape.base as ExtrudedShape
        expect(shape.polygon.outer.points).toHaveLength(4)
        expect(shape.plane).toBe('xy')
        expect(shape.thickness).toBe(defaultConfig.height)
      })
    })

    it('attaches polygon part info to each element', () => {
      const mockInfo = { partId: 'fubar' } as PartInfo
      polygonPartInfoMock.mockReturnValue(mockInfo)

      const model = assembly.construct(perimeter, defaultConfig)

      model.elements.forEach(element => {
        assertConstructionElement(element)
        const shape = element.shape.base as ExtrudedShape
        expect(element.partInfo).toEqual(mockInfo)
        expect(polygonPartInfoMock).toHaveBeenCalledWith('ring-beam', shape.polygon.outer, shape.plane, shape.thickness)
      })
    })

    it('creates inside area', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      const area = model.areas.find(
        (a): a is HighlightedPolygon => a.type === 'polygon' && a.areaType === 'inner-perimeter'
      )
      expect(area?.tags).toContain(TAG_PERIMETER_INSIDE)
      expect(area?.polygon.points).toEqual(corners.map(corner => corner.outsidePoint))
    })

    it('creates outside area', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      const outerPolygonArea = model.areas.find(
        (area): area is HighlightedPolygon => area.type === 'polygon' && area.areaType === 'outer-perimeter'
      )
      expect(outerPolygonArea?.tags).toContain(TAG_PERIMETER_OUTSIDE)
      expect(outerPolygonArea?.polygon.points).toEqual(corners.map(corner => corner.outsidePoint))
    })

    it('model does not have errors or warnings', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      expect(model.errors).toHaveLength(0)
      expect(model.warnings).toHaveLength(0)
    })

    it('model has bounds', () => {
      const model = assembly.construct(perimeter, defaultConfig)

      expect(model.bounds.min).toEqual(vec3.fromValues(0, 0, 0))
      expect(model.bounds.max).toEqual(vec3.fromValues(4000, 3000, defaultConfig.height))
    })

    it('passes through offset distance variations to the geometry helpers', () => {
      const corners = [
        createMockCorner('c1', vec2.fromValues(0, 0)),
        createMockCorner('c2', vec2.fromValues(0, 1000)),
        createMockCorner('c3', vec2.fromValues(1000, 1000)),
        createMockCorner('c4', vec2.fromValues(1000, 0))
      ]
      const perimeter = createMockPerimeter(corners)

      const config: FullRingBeamConfig = {
        ...defaultConfig,
        offsetFromEdge: 50,
        width: 240
      }

      assembly.construct(perimeter, config)

      expect(offsetPolygonMock).toHaveBeenNthCalledWith(1, simplifiedPolygon, config.offsetFromEdge)
      expect(offsetPolygonMock).toHaveBeenNthCalledWith(2, simplifiedPolygon, config.offsetFromEdge + config.width)
    })
  })
})
