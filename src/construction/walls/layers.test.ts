import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OpeningWithGeometry, PerimeterCornerWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import {
  type StoreyId,
  createOpeningId,
  createPerimeterCornerId,
  createPerimeterWallId,
  createWallAssemblyId
} from '@/building/model/ids'
import type { ConstructionElement, GroupOrElement } from '@/construction/elements'
import type { FloorAssembly } from '@/construction/floors'
import { clayPlasterBase, limePlasterBase } from '@/construction/materials/material'
import type { ExtrudedShape } from '@/construction/shapes'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE } from '@/construction/tags'
import type { WallCornerInfo } from '@/construction/walls'
import type { WallContext } from '@/construction/walls/corners/corners'
import type { WallLayersConfig } from '@/construction/walls/types'
import { type Polygon2D, type PolygonWithHoles2D, ZERO_VEC2, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { constructWallLayers } from './layers'

vi.mock('@/shared/geometry', async importOriginal => {
  return {
    ...(await importOriginal()),
    ensurePolygonIsClockwise: vi.fn(i => i),
    simplifyPolygon: vi.fn(i => i),
    intersectPolygon: vi.fn((_subjects: PolygonWithHoles2D[], clips: PolygonWithHoles2D[]) => clips),
    subtractPolygons: vi.fn((subjects: Polygon2D[], clips: Polygon2D[]) => {
      if (subjects.length === 0) {
        return []
      }

      return [
        {
          outer: subjects[0],
          holes: clips
        }
      ]
    })
  }
})

const mockAssemblies = new Map<string, { layers: WallLayersConfig }>()
const mockOpenings = new Map<string, OpeningWithGeometry>()

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

vi.mock('@/building/store', () => ({
  getModelActions: () => ({
    getWallOpeningById: (id: string) => mockOpenings.get(id) ?? null,
    getRoofsByStorey: () => []
  })
}))

vi.mock('@/construction/walls/corners/corners', () => ({
  getWallContext: () => wallContext,
  calculateWallCornerInfo: () => cornerInfo
}))

vi.mock('@/construction/derived/perimeterContextCache', () => ({
  getPerimeterContextCached: vi.fn()
}))

const createWall = (overrides: Partial<PerimeterWallWithGeometry> = {}) =>
  partial<PerimeterWallWithGeometry>({
    id: createPerimeterWallId(),
    thickness: 300,
    wallAssemblyId: baseAssemblyId,
    insideLength: 3000,
    outsideLength: 3000,
    wallLength: 3000,
    entityIds: [],
    insideLine: {
      start: ZERO_VEC2,
      end: newVec2(3000, 0)
    },
    outsideLine: {
      start: newVec2(0, 300),
      end: newVec2(3000, 300)
    },
    direction: newVec2(1, 0),
    outsideDirection: newVec2(0, 1),
    ...overrides
  })

const createCorner = (overrides: Partial<PerimeterCornerWithGeometry>): PerimeterCornerWithGeometry =>
  ({
    id: createPerimeterCornerId(),
    insidePoint: ZERO_VEC2,
    outsidePoint: newVec2(0, 300),
    constructedByWall: 'next',
    interiorAngle: 90,
    exteriorAngle: 270,
    ...overrides
  }) as PerimeterCornerWithGeometry

const storeyContext: StoreyContext = {
  storeyId: 'storey-id' as StoreyId,
  storeyHeight: 3250,
  roofBottom: 3000,
  wallTop: 3000,
  ceilingConstructionBottom: 2900,
  finishedCeilingBottom: 2800,
  finishedFloorTop: 200,
  floorConstructionTop: 20,
  wallBottom: 50,
  floorBottom: -200,
  floorAssembly: {} as FloorAssembly,
  perimeterContexts: []
}

const baseLayers: WallLayersConfig = {
  insideThickness: 30,
  insideLayers: [
    {
      type: 'monolithic',
      name: 'Inside Layer',
      material: clayPlasterBase.id,
      thickness: 30
    }
  ],
  outsideThickness: 20,
  outsideLayers: [
    {
      type: 'monolithic',
      name: 'Outside Layer',
      material: limePlasterBase.id,
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

const expectExtrudedPolygon = (element: ConstructionElement): ExtrudedShape => {
  if (element.shape.base?.type !== 'extrusion') {
    throw new Error('Expected extruded polygon element')
  }
  return element.shape.base
}

describe('constructWallLayers', () => {
  beforeEach(() => {
    applyAssemblies()
    mockOpenings.clear()

    const wall = createWall()
    const previousWall = createWall({ id: createPerimeterWallId(), wallAssemblyId: previousAssemblyId })
    const nextWall = createWall({ id: createPerimeterWallId(), wallAssemblyId: nextAssemblyId })

    previousWall.insideLine = {
      start: newVec2(0, -3000),
      end: ZERO_VEC2
    }
    previousWall.outsideLine = {
      start: newVec2(-300, -3000),
      end: newVec2(-300, 0)
    }
    previousWall.direction = newVec2(0, 1)
    previousWall.outsideDirection = newVec2(-1, 0)
    previousWall.insideLength = 3000
    previousWall.outsideLength = 3000
    previousWall.wallLength = 3000

    nextWall.insideLine = {
      start: newVec2(3000, 0),
      end: newVec2(3000, 3000)
    }
    nextWall.outsideLine = {
      start: newVec2(3300, 0),
      end: newVec2(3300, 3000)
    }
    nextWall.direction = newVec2(0, 1)
    nextWall.outsideDirection = newVec2(1, 0)
    nextWall.insideLength = 3000
    nextWall.outsideLength = 3000
    nextWall.wallLength = 3000

    const startCorner = createCorner({
      id: createPerimeterCornerId(),
      insidePoint: ZERO_VEC2,
      outsidePoint: newVec2(-300, 300),
      constructedByWall: 'next'
    })
    const endCorner = createCorner({
      id: createPerimeterCornerId(),
      insidePoint: newVec2(3000, 0),
      outsidePoint: newVec2(3300, 300),
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
      extensionEnd: 0,
      constructionInsideLine: wall.insideLine,
      constructionOutsideLine: wall.outsideLine
    }
  })

  it('creates extruded polygons for inside and outside layers', () => {
    const wall = createWall()

    const model = constructWallLayers(wall, storeyContext, baseLayers)

    const elements = flattenElements(model.elements)
    expect(elements).toHaveLength(2)

    const inside = elements.find(
      element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 30
    )
    const outside = elements.find(
      element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 20
    )
    expect(inside).toBeDefined()
    expect(outside).toBeDefined()

    if (!inside || !outside) {
      throw new Error('Expected inside and outside elements')
    }

    const insidePolygon = expectExtrudedPolygon(inside)
    const outsidePolygon = expectExtrudedPolygon(outside)

    expect(insidePolygon.polygon.outer.points).toHaveLength(4)
    expect(insidePolygon.polygon.outer.points).toEqual([
      newVec2(-30, -30),
      newVec2(3030, -30),
      newVec2(3030, 2950),
      newVec2(-30, 2950)
    ])

    expect(outsidePolygon.polygon.outer.points).toHaveLength(4)
    expect(outsidePolygon.polygon.outer.points).toEqual([
      newVec2(-300, -250),
      newVec2(3300, -250),
      newVec2(3300, 2950),
      newVec2(-300, 2950)
    ])

    const layerGroups = model.elements.filter((element): element is GroupOrElement => 'children' in element)
    expect(layerGroups).toHaveLength(2)

    const insideGroup = layerGroups.find(group => group.tags?.includes(TAG_WALL_LAYER_INSIDE))
    const outsideGroup = layerGroups.find(group => group.tags?.includes(TAG_WALL_LAYER_OUTSIDE))

    expect(insideGroup?.tags).toContain(TAG_LAYERS)
    expect(outsideGroup?.tags).toContain(TAG_LAYERS)
    const insideCustom = insideGroup?.tags?.find(tag => tag.category === 'wall-layer' && tag !== TAG_WALL_LAYER_INSIDE)
    const outsideCustom = outsideGroup?.tags?.find(
      tag => tag.category === 'wall-layer' && tag !== TAG_WALL_LAYER_OUTSIDE
    )

    expect(insideCustom && 'label' in insideCustom ? insideCustom.label : undefined).toBe('Inside Layer')
    expect(outsideCustom && 'label' in outsideCustom ? outsideCustom.label : undefined).toBe('Outside Layer')
  })

  it('adds holes for openings', () => {
    const opening = partial<OpeningWithGeometry>({
      id: createOpeningId(),
      openingType: 'window',
      centerOffsetFromWallStart: 1450,
      width: 900,
      height: 1200,
      sillHeight: 900
    })
    mockOpenings.set(opening.id, opening)

    const wall = createWall({ entityIds: [opening.id] })

    const model = constructWallLayers(wall, storeyContext, baseLayers)

    const elements = flattenElements(model.elements)
    const inside = elements.find(
      element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 30
    )
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
    expect(Math.max(...xs)).toBeCloseTo(1000 + 900)
    expect(Math.min(...ys)).toBeCloseTo(900 + 200 - 50)
    expect(Math.max(...ys)).toBeCloseTo(900 + 1200 + 200 - 50)
  })

  it('extends exterior layers when wall constructs the corner', () => {
    const wall = createWall()

    const baselineOutsideStart = (() => {
      const baselineModel = constructWallLayers(wall, storeyContext, baseLayers)
      const baselineOutside = flattenElements(baselineModel.elements).find(
        element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 20
      )
      if (!baselineOutside) {
        throw new Error('Baseline outside layer missing')
      }
      return expectExtrudedPolygon(baselineOutside).polygon.outer.points[0][0]
    })()

    wallContext.previousWall.outsideLine = {
      start: newVec2(-360, -3000),
      end: newVec2(-360, 0)
    }

    const model = constructWallLayers(wall, storeyContext, baseLayers)
    const elements = flattenElements(model.elements)
    const outside = elements.find(
      element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 20
    )

    expect(outside).toBeDefined()
    if (!outside) {
      throw new Error('Outside layer was not constructed')
    }

    const outsidePolygon = expectExtrudedPolygon(outside)

    expect(outsidePolygon.polygon.outer.points[0][0]).toBeLessThan(baselineOutsideStart)
  })

  it('shortens interior layers on inner corners not owned by the wall', () => {
    const wall = createWall()

    const baselineInsideStart = (() => {
      const baselineModel = constructWallLayers(wall, storeyContext, baseLayers)
      const baselineInside = flattenElements(baselineModel.elements).find(
        element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 30
      )
      if (!baselineInside) {
        throw new Error('Baseline inside layer missing')
      }
      return expectExtrudedPolygon(baselineInside).polygon.outer.points[0][0]
    })()

    wallContext.previousWall.insideLine = {
      start: newVec2(40, -3000),
      end: newVec2(40, 0)
    }

    const model = constructWallLayers(wall, storeyContext, baseLayers)
    const elements = flattenElements(model.elements)
    const inside = elements.find(
      element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 30
    )

    expect(inside).toBeDefined()
    if (!inside) {
      throw new Error('Inside layer was not constructed')
    }

    const insidePolygon = expectExtrudedPolygon(inside)

    expect(insidePolygon.polygon.outer.points[0][0]).toBeGreaterThan(baselineInsideStart)
  })
})
