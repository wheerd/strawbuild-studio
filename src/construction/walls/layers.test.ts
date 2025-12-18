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
import { clayPlasterBase, limePlasterBase } from '@/construction/materials/material'
import type { ExtrudedShape } from '@/construction/shapes'
import { TAG_LAYERS, TAG_WALL_LAYER_INSIDE, TAG_WALL_LAYER_OUTSIDE } from '@/construction/tags'
import type { WallCornerInfo } from '@/construction/walls'
import type { WallContext } from '@/construction/walls/corners/corners'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { WallLayersConfig } from '@/construction/walls/types'
import type { Polygon2D, PolygonWithHoles2D } from '@/shared/geometry'

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
  referenceSide: 'inside',
  referencePolygon: (overrides.referencePolygon as vec2[] | undefined) ?? ([] as unknown as vec2[]),
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
  storeyHeight: 3500,
  ceilingHeight: 3000,
  floorTopOffset: 50,
  ceilingBottomOffset: 40,
  floorConstructionThickness: 200,
  floorTopConstructionOffset: 10,
  ceilingBottomConstructionOffset: 20,
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
  const wallConfig = { openingAssemblyId: undefined } as any

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
      extensionEnd: 0,
      constructionInsideLine: wall.insideLine,
      constructionOutsideLine: wall.outsideLine
    }
  })

  it('creates extruded polygons for inside and outside layers', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)

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
      vec2.fromValues(-30, 10),
      vec2.fromValues(3030, 10),
      vec2.fromValues(3030, 3080),
      vec2.fromValues(-30, 3080)
    ])

    expect(outsidePolygon.polygon.outer.points).toHaveLength(4)
    expect(outsidePolygon.polygon.outer.points).toEqual([
      vec2.fromValues(-300, -200),
      vec2.fromValues(3300, -200),
      vec2.fromValues(3300, 3080),
      vec2.fromValues(-300, 3080)
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

    expect(insideCustom?.label).toBe('Inside Layer')
    expect(outsideCustom?.label).toBe('Outside Layer')
  })

  it('adds holes for openings', () => {
    const opening: Opening = {
      id: createOpeningId(),
      type: 'window',
      centerOffsetFromWallStart: 1450,
      width: 900,
      height: 1200,
      sillHeight: 900
    }

    const wall = createWall({ openings: [opening] })
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)

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

    expect(Math.min(...xs)).toBeCloseTo(1000 - 15)
    expect(Math.max(...xs)).toBeCloseTo(1000 + 900 + 15)
    expect(Math.min(...ys)).toBeCloseTo(900 + 50 - 15)
    expect(Math.max(...ys)).toBeCloseTo(900 + 1200 + 50 + 15)
  })

  it('extends exterior layers when wall constructs the corner', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const baselineOutsideStart = (() => {
      const baselineModel = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)
      const baselineOutside = flattenElements(baselineModel.elements).find(
        element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 20
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

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)
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
    const perimeter = createPerimeter(wall)

    const baselineInsideStart = (() => {
      const baselineModel = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)
      const baselineInside = flattenElements(baselineModel.elements).find(
        element => element.shape.base?.type === 'extrusion' && element.shape.base.thickness === 30
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

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers, wallConfig)
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
