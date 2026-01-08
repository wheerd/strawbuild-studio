import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model'
import { type StoreyId, createOpeningId, createPerimeterId, createWallAssemblyId } from '@/building/model/ids'
import type { FloorAssembly } from '@/construction/floors'
import { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { constructPost } from '@/construction/materials/posts'
import { constructStraw } from '@/construction/materials/straw'
import { type IssueMessageKey, yieldElement, yieldError, yieldMeasurement, yieldWarning } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_POST_SPACING } from '@/construction/tags'
import type { InfillWallConfig, InfillWallSegmentConfig, WallLayersConfig } from '@/construction/walls'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import { IDENTITY, type Length, type Vec3, ZERO_VEC2, newVec2, newVec3 } from '@/shared/geometry'

import { InfillWallAssembly } from './assembly'

function createMockStoreyContext(storeyHeight: Length = 2500): StoreyContext {
  return {
    storeyId: 'storey-id' as StoreyId,
    storeyHeight,
    roofBottom: 0,
    wallTop: 0,
    ceilingConstructionBottom: 0,
    finishedCeilingBottom: 0,
    finishedFloorTop: 0,
    floorConstructionTop: 0,
    wallBottom: 0,
    floorBottom: 0,
    floorAssembly: {} as FloorAssembly,
    perimeterContexts: []
  }
}

// Mock dependencies
vi.mock('@/construction/floors', () => ({
  FLOOR_ASSEMBLIES: {
    monolithic: {
      getTopOffset: vi.fn(() => 0),
      getBottomOffset: vi.fn(() => 0)
    },
    joist: {
      getTopOffset: vi.fn(() => 0),
      getBottomOffset: vi.fn(() => 0)
    }
  }
}))

vi.mock('@/construction/materials/posts', () => ({
  constructPost: vi.fn()
}))

vi.mock('@/construction/materials/straw', () => ({
  constructStraw: vi.fn()
}))

vi.mock('@/construction/openings/openings', () => ({
  constructOpeningFrame: vi.fn()
}))

vi.mock('@/construction/walls/segmentation', () => ({
  segmentedWallConstruction: vi.fn()
}))

vi.mock('@/construction/walls/layers', () => ({
  constructWallLayers: vi.fn(() => ({
    elements: [],
    measurements: [],
    areas: [],
    errors: [],
    warnings: [],
    bounds: {
      min: newVec3(0, 0, 0),
      max: newVec3(0, 0, 0)
    }
  }))
}))

vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: Length) => `${length}mm`)
}))

const mockConstructPost = vi.mocked(constructPost)
const mockConstructStraw = vi.mocked(constructStraw)
const mockSegmentedWallConstruction = vi.mocked(segmentedWallConstruction)

// Test data helpers
const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId

function createMockElement(id: string, position: Vec3, size: Vec3, material: MaterialId) {
  return {
    id: id as any,
    material,
    shape: {
      type: 'cuboid' as const,
      offset: position,
      size,
      bounds: { min: position, max: [position[0] + size[0], position[1] + size[1], position[2] + size[2]] }
    },
    transform: IDENTITY,
    bounds: { min: position, max: [position[0] + size[0], position[1] + size[1], position[2] + size[2]] }
  }
}

function createMockGenerator(
  elements: any[] = [],
  measurements: any[] = [],
  errors: IssueMessageKey[] = [],
  warnings: IssueMessageKey[] = []
) {
  return function* () {
    for (const element of elements) {
      yield* yieldElement(element)
    }
    for (const measurement of measurements) {
      yield yieldMeasurement(measurement)
    }
    for (const error of errors) {
      yield yieldError(error, undefined, [])
    }
    for (const warning of warnings) {
      yield yieldWarning(warning, undefined, [])
    }
  }
}

function createMockPostConfig(): PostConfig {
  return {
    type: 'full',
    width: 60,
    material: mockWoodMaterial
  }
}

function createMockInfillConfig(overrides: Partial<InfillWallSegmentConfig> = {}): InfillWallSegmentConfig {
  return {
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: createMockPostConfig(),
    triangularBattens: {
      size: 30,
      material: mockWoodMaterial,
      inside: false,
      outside: false,
      minLength: 100
    },
    ...overrides
  }
}

function createMockWall(
  id = 'test-wall',
  wallLength: Length = 3000,
  thickness: Length = 300,
  openings: Opening[] = []
): PerimeterWall {
  return {
    id: id as any,
    wallAssemblyId: createWallAssemblyId(),
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: wallLength,
    openings,
    posts: [],
    insideLine: {
      start: ZERO_VEC2,
      end: newVec2(wallLength, 0)
    },
    outsideLine: {
      start: newVec2(0, thickness),
      end: newVec2(wallLength, thickness)
    },
    direction: newVec2(1, 0),
    outsideDirection: newVec2(0, 1)
  }
}

function createMockPerimeter(walls: PerimeterWall[]): Perimeter {
  return {
    id: createPerimeterId(),
    storeyId: 'test-storey' as any,
    referenceSide: 'inside',
    referencePolygon: [],
    walls,
    corners: []
  } as Perimeter
}

function createMockLayers(): WallLayersConfig {
  return {
    insideThickness: 30,
    insideLayers: [],
    outsideThickness: 50,
    outsideLayers: []
  }
}

describe('assembly.construct', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock segmentedWallConstruction to call our wall and opening construction functions
    mockSegmentedWallConstruction.mockImplementation(
      function* (wall, _perimeter, _storeyContext, _layers, wallConstruction, infill, _padding) {
        const wallArea = new WallConstructionArea(newVec3(0, 30, 60), newVec3(3000, 220, 2380))
        // Simulate calling wall construction
        yield* wallConstruction(wallArea, true, true, false)

        // Simulate calling opening construction if there are openings
        if (wall.openings.length > 0) {
          const openingArea = new WallConstructionArea(newVec3(1000, 30, 60), newVec3(800, 220, 900))
          yield* infill(openingArea)
        }
      }
    )

    // Mock the construction functions
    mockConstructPost.mockReturnValue(
      createMockGenerator([createMockElement('post', newVec3(0, 0, 0), newVec3(60, 300, 2500), mockWoodMaterial)])()
    )
    mockConstructStraw.mockReturnValue(
      createMockGenerator([createMockElement('straw', newVec3(0, 0, 0), newVec3(800, 300, 2500), mockStrawMaterial)])()
    )
  })

  describe('full wall construction', () => {
    let config: InfillWallConfig
    let assembly: InfillWallAssembly

    beforeEach(() => {
      config = {
        type: 'infill',
        ...createMockInfillConfig(),
        layers: createMockLayers()
      }
      assembly = new InfillWallAssembly(config)
    })

    it('should construct a complete infill wall with no openings', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.bounds).toBeDefined()
      expect(mockSegmentedWallConstruction).toHaveBeenCalledWith(
        wall,
        perimeter,
        createMockStoreyContext(floorHeight),
        config.layers,
        expect.any(Function), // wallConstruction function
        expect.any(Function), // openingConstruction function
        undefined
      )
    })

    it('should construct infill wall with openings', () => {
      const opening = {
        id: createOpeningId(),
        type: 'window' as const,
        centerOffsetFromWallStart: 1000,
        width: 800,
        height: 1200,
        sillHeight: 900
      }
      const wall = createMockWall('test-wall', 3000, 300, [opening])
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should propagate errors and warnings from infill construction', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      // Mock segmented construction to return errors/warnings
      const mockError = 'Test error' as any
      const mockWarning = 'Test warning' as any
      const mockElement = createMockElement('test', newVec3(0, 0, 0), newVec3(100, 100, 100), mockWoodMaterial)

      mockSegmentedWallConstruction.mockReturnValue(
        createMockGenerator([mockElement], [], [mockError], [mockWarning])()
      )

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.errors[0].messageKey).toBe(mockError)
      expect(result.warnings[0].messageKey).toBe(mockWarning)
    })

    it('should include measurements in the result', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const mockMeasurement = {
        startPoint: newVec3(0, 0, 0),
        endPoint: newVec3(800, 0, 0),
        label: '800mm',
        tags: [TAG_POST_SPACING],
        groupKey: 'post-spacing',
        offset: 1
      }

      const mockElement = createMockElement('test', newVec3(0, 0, 0), newVec3(100, 100, 100), mockWoodMaterial)
      mockSegmentedWallConstruction.mockReturnValue(createMockGenerator([mockElement], [mockMeasurement])())

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      expect(result.measurements).toHaveLength(1)
      expect(result.measurements[0]).toBe(mockMeasurement)
    })

    it('should calculate correct bounds from all elements', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      expect(result.bounds).toBeDefined()
      expect(result.bounds.min).toBeDefined()
      expect(result.bounds.max).toBeDefined()
      // Bounds should encompass all elements
      expect(result.bounds.min[0]).toBeLessThanOrEqual(result.bounds.max[0])
      expect(result.bounds.min[1]).toBeLessThanOrEqual(result.bounds.max[1])
      expect(result.bounds.min[2]).toBeLessThanOrEqual(result.bounds.max[2])
    })

    it('should pass infillWallArea function as wall construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const area = new WallConstructionArea(newVec3(0, 0, 0), newVec3(1000, 300, 2500))

      assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      const wallConstructionFn = mockSegmentedWallConstruction.mock.calls[0][4]
      expect(wallConstructionFn).toBeDefined()

      // Test that the wall construction function works
      const result = [...wallConstructionFn(area, true, true, false)]
      expect(result.length).toBeGreaterThan(0)
    })

    it('should pass constructOpeningFrame function as opening construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const area = new WallConstructionArea(newVec3(1000, 30, 60), newVec3(800, 220, 2380))

      assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight))

      const infillFn = mockSegmentedWallConstruction.mock.calls[0][5]
      expect(infillFn).toBeDefined()

      const result = [...infillFn(area)]
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
