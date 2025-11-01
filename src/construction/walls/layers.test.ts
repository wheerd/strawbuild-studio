import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createOpeningId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId,
  createStoreyId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { ConstructionElement, GroupOrElement } from '@/construction/elements'
import { clayPlaster, limePlaster } from '@/construction/materials/material'
import type { ExtrudedPolygon } from '@/construction/shapes'
import type { WallCornerInfo } from '@/construction/walls'
import type { WallContext } from '@/construction/walls/corners/corners'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { WallLayersConfig } from '@/construction/walls/types'
import type { Polygon2D } from '@/shared/geometry'

import { constructWallLayers } from './layers'

vi.mock('@/shared/geometry', async () => {
  const actual = await vi.importActual<typeof import('@/shared/geometry')>('@/shared/geometry')

  return {
    ...actual,
    subtractPolygons: vi.fn((subjects: Polygon2D[], clips: Polygon2D[]) => {
      if (subjects.length === 0) {
        return []
      }

      const outer = actual.ensurePolygonIsClockwise(subjects[0])
      const holes = clips.map(clip => actual.ensurePolygonIsCounterClockwise(clip))

      return [
        {
          outer,
          holes
        }
      ]
    })
  }
})

const mockAssemblies = new Map<string, { layers: WallLayersConfig }>()

const baseAssemblyId = createWallAssemblyId()
const previousAssemblyId = createWallAssemblyId()
const nextAssemblyId = createWallAssemblyId()

let wallContext: WallContext
let cornerInfo: WallCornerInfo

vi.mock('@/construction/config', () => ({
  getConfigActions: () => ({
    getWallAssemblyById: (id: string) => mockAssemblies.get(id) ?? null,
    getRingBeamAssemblyById: () => null
  })
}))

vi.mock('@/construction/walls/corners/corners', () => ({
  getWallContext: () => wallContext,
  calculateWallCornerInfo: () => cornerInfo
}))

const createWall = (overrides: Partial<PerimeterWall> = {}): PerimeterWall => ({
  id: createPerimeterWallId(),
  thickness: 300,
  wallAssemblyId: baseAssemblyId,
  openings: [],
  insideLength: 3000,
  outsideLength: 3000,
  wallLength: 3000,
  insideLine: {
    start: vec2.fromValues(0, 0),
    end: vec2.fromValues(3000, 0)
  },
  outsideLine: {
    start: vec2.fromValues(0, 300),
    end: vec2.fromValues(3000, 300)
  },
  direction: vec2.fromValues(1, 0),
  outsideDirection: vec2.fromValues(0, 1),
  ...overrides
})

const createPerimeter = (wall: PerimeterWall, overrides: Partial<Perimeter> = {}): Perimeter => ({
  id: createPerimeterId(),
  storeyId: createStoreyId(),
  walls: [wall],
  corners: [],
  ...overrides
})

const createCorner = (overrides: Partial<PerimeterCorner>): PerimeterCorner => ({
  id: createPerimeterCornerId(),
  insidePoint: vec2.fromValues(0, 0),
  outsidePoint: vec2.fromValues(0, 300),
  constructedByWall: 'next',
  interiorAngle: 90,
  exteriorAngle: 270,
  ...overrides
})

const storeyContext: WallStoreyContext = {
  storeyHeight: 3000,
  floorTopOffset: 0,
  ceilingBottomOffset: 0
}

const baseLayers: WallLayersConfig = {
  insideThickness: 30,
  insideLayers: [
    {
      type: 'monolithic',
      material: clayPlaster.id,
      thickness: 30
    }
  ],
  outsideThickness: 20,
  outsideLayers: [
    {
      type: 'monolithic',
      material: limePlaster.id,
      thickness: 20
    }
  ]
}

const applyAssemblies = () => {
  mockAssemblies.clear()
  const assembly = { layers: baseLayers }
  mockAssemblies.set(baseAssemblyId, assembly)
  mockAssemblies.set(previousAssemblyId, assembly)
  mockAssemblies.set(nextAssemblyId, assembly)
}

const flattenElements = (items: GroupOrElement[]): ConstructionElement[] => {
  const result: ConstructionElement[] = []

  const visit = (entry: GroupOrElement) => {
    if ('children' in entry) {
      entry.children.forEach(visit)
      return
    }
    result.push(entry)
  }

  items.forEach(visit)
  return result
}

const expectExtrudedPolygon = (element: ConstructionElement): ExtrudedPolygon => {
  if (element.shape.type !== 'polygon') {
    throw new Error('Expected extruded polygon element')
  }
  return element.shape
}

describe('constructWallLayers', () => {
  beforeEach(() => {
    applyAssemblies()

    const wall = createWall()
    const previousWall = createWall({ id: createPerimeterWallId(), wallAssemblyId: previousAssemblyId })
    const nextWall = createWall({ id: createPerimeterWallId(), wallAssemblyId: nextAssemblyId })

    previousWall.insideLine = {
      start: vec2.fromValues(0, -3000),
      end: vec2.fromValues(0, 0)
    }
    previousWall.outsideLine = {
      start: vec2.fromValues(-300, -3000),
      end: vec2.fromValues(-300, 0)
    }
    previousWall.direction = vec2.fromValues(0, 1)
    previousWall.outsideDirection = vec2.fromValues(-1, 0)
    previousWall.insideLength = 3000
    previousWall.outsideLength = 3000
    previousWall.wallLength = 3000

    nextWall.insideLine = {
      start: vec2.fromValues(3000, 0),
      end: vec2.fromValues(3000, 3000)
    }
    nextWall.outsideLine = {
      start: vec2.fromValues(3300, 0),
      end: vec2.fromValues(3300, 3000)
    }
    nextWall.direction = vec2.fromValues(0, 1)
    nextWall.outsideDirection = vec2.fromValues(1, 0)
    nextWall.insideLength = 3000
    nextWall.outsideLength = 3000
    nextWall.wallLength = 3000

    const startCorner = createCorner({
      id: createPerimeterCornerId(),
      insidePoint: vec2.fromValues(0, 0),
      outsidePoint: vec2.fromValues(-300, 300),
      constructedByWall: 'next'
    })
    const endCorner = createCorner({
      id: createPerimeterCornerId(),
      insidePoint: vec2.fromValues(3000, 0),
      outsidePoint: vec2.fromValues(3300, 300),
      constructedByWall: 'previous'
    })

    wallContext = {
      startCorner,
      endCorner,
      previousWall,
      nextWall
    }

    cornerInfo = {
      startCorner: {
        id: startCorner.id,
        constructedByThisWall: true,
        extensionDistance: 0
      },
      endCorner: {
        id: endCorner.id,
        constructedByThisWall: true,
        extensionDistance: 0
      },
      extensionStart: 0,
      constructionLength: wall.wallLength,
      extensionEnd: 0
    }
  })

  it('creates extruded polygons for inside and outside layers', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)

    const elements = flattenElements(model.elements)
    expect(elements).toHaveLength(2)

    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)
    const outside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 20)
    expect(inside).toBeDefined()
    expect(outside).toBeDefined()

    if (!inside || !outside) {
      throw new Error('Expected inside and outside elements')
    }

    const insidePolygon = expectExtrudedPolygon(inside)
    const outsidePolygon = expectExtrudedPolygon(outside)

    expect(insidePolygon.polygon.outer.points[0][0]).toBeCloseTo(-30)
    expect(insidePolygon.polygon.outer.points[2][0]).toBeCloseTo(3030)

    expect(outsidePolygon.polygon.outer.points[0][0]).toBeCloseTo(-300)
    expect(outsidePolygon.polygon.outer.points[2][0]).toBeCloseTo(3300)

    expect(insidePolygon.polygon.outer.points[0][1]).toBeCloseTo(0)
    expect(insidePolygon.polygon.outer.points[1][1]).toBeCloseTo(3000)
  })

  it('adds holes for openings', () => {
    const opening: Opening = {
      id: createOpeningId(),
      type: 'window',
      offsetFromStart: 1000,
      width: 900,
      height: 1200,
      sillHeight: 900
    }

    const wall = createWall({ openings: [opening] })
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)

    const elements = flattenElements(model.elements)
    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)
    expect(inside).toBeDefined()

    if (!inside) {
      throw new Error('Inside layer was not constructed')
    }

    const insidePolygon = expectExtrudedPolygon(inside)

    expect(insidePolygon.polygon.holes).toHaveLength(1)
    const hole = insidePolygon.polygon.holes[0]

    const xs = hole.points.map(point => point[0])
    const ys = hole.points.map(point => point[1])

    expect(Math.min(...xs)).toBeCloseTo(1000)
    expect(Math.max(...xs)).toBeCloseTo(1900)
    expect(Math.min(...ys)).toBeCloseTo(900)
    expect(Math.max(...ys)).toBeCloseTo(2100)
  })

  it('extends exterior layers when wall constructs the corner', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const baselineOutsideStart = (() => {
      const baselineModel = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
      const baselineOutside = flattenElements(baselineModel.elements).find(
        element => element.shape.type === 'polygon' && element.shape.thickness === 20
      )
      if (!baselineOutside) {
        throw new Error('Baseline outside layer missing')
      }
      return expectExtrudedPolygon(baselineOutside).polygon.outer.points[0][0]
    })()

    wallContext.previousWall.outsideLine = {
      start: vec2.fromValues(-360, -3000),
      end: vec2.fromValues(-360, 0)
    }

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
    const elements = flattenElements(model.elements)
    const outside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 20)

    expect(outside).toBeDefined()
    if (!outside) {
      throw new Error('Outside layer was not constructed')
    }

    const outsidePolygon = expectExtrudedPolygon(outside)

    expect(outsidePolygon.polygon.outer.points[0][0]).toBeLessThan(baselineOutsideStart)
  })

  it('shortens interior layers on inner corners not owned by the wall', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const baselineInsideStart = (() => {
      const baselineModel = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
      const baselineInside = flattenElements(baselineModel.elements).find(
        element => element.shape.type === 'polygon' && element.shape.thickness === 30
      )
      if (!baselineInside) {
        throw new Error('Baseline inside layer missing')
      }
      return expectExtrudedPolygon(baselineInside).polygon.outer.points[0][0]
    })()

    wallContext.previousWall.insideLine = {
      start: vec2.fromValues(40, -3000),
      end: vec2.fromValues(40, 0)
    }

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
    const elements = flattenElements(model.elements)
    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)

    expect(inside).toBeDefined()
    if (!inside) {
      throw new Error('Inside layer was not constructed')
    }

    const insidePolygon = expectExtrudedPolygon(inside)

    expect(insidePolygon.polygon.outer.points[0][0]).toBeGreaterThan(baselineInsideStart)
  })
})
