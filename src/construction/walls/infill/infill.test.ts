import { vec2, vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId, createPerimeterId, createWallAssemblyId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import { IDENTITY, WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { constructPost } from '@/construction/materials/posts'
import { constructStraw } from '@/construction/materials/straw'
import { constructOpeningFrame } from '@/construction/openings/openings'
import { aggregateResults, yieldElement, yieldError, yieldMeasurement, yieldWarning } from '@/construction/results'
import { TAG_POST_SPACING } from '@/construction/tags'
import type { InfillWallConfig, InfillWallSegmentConfig, WallLayersConfig } from '@/construction/walls'
import { type WallStoreyContext } from '@/construction/walls/segmentation'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import type { Length } from '@/shared/geometry'
import '@/shared/geometry'

import { InfillWallAssembly, infillWallArea } from './infill'

function createMockStoreyContext(storeyHeight: Length = 2500): WallStoreyContext {
  return {
    storeyHeight: 0,
    floorConstructionThickness: 0,
    ceilingHeight: storeyHeight,
    floorTopOffset: 0,
    ceilingBottomOffset: 0,
    ceilingBottomConstructionOffset: 0,
    floorTopConstructionOffset: 0
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
      min: vec3.fromValues(0, 0, 0),
      max: vec3.fromValues(0, 0, 0)
    }
  }))
}))

vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: Length) => `${length}mm`)
}))

const mockConstructPost = vi.mocked(constructPost)
const mockConstructStraw = vi.mocked(constructStraw)
const mockConstructOpeningFrame = vi.mocked(constructOpeningFrame)
const mockSegmentedWallConstruction = vi.mocked(segmentedWallConstruction)

// Test data helpers
const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId
const mockHeaderMaterial = 'header-material' as MaterialId

function createMockElement(id: string, position: vec3, size: vec3, material: MaterialId) {
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
  errors: string[] = [],
  warnings: string[] = []
) {
  return function* () {
    for (const element of elements) {
      yield* yieldElement(element)
    }
    for (const measurement of measurements) {
      yield yieldMeasurement(measurement)
    }
    for (const error of errors) {
      yield yieldError(error, [])
    }
    for (const warning of warnings) {
      yield yieldWarning(warning, [])
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
    insideLine: {
      start: vec2.fromValues(0, 0),
      end: vec2.fromValues(wallLength, 0)
    },
    outsideLine: {
      start: vec2.fromValues(0, thickness),
      end: vec2.fromValues(wallLength, thickness)
    },
    direction: vec2.fromValues(1, 0),
    outsideDirection: vec2.fromValues(0, 1)
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

describe('infillWallArea', () => {
  let config: InfillWallSegmentConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockConstructPost.mockReturnValue(
      createMockGenerator([
        createMockElement('post-1', vec3.fromValues(0, 0, 0), vec3.fromValues(60, 300, 2500), mockWoodMaterial)
      ])()
    )

    mockConstructStraw.mockReturnValue(
      createMockGenerator([
        createMockElement('straw-1', vec3.fromValues(0, 0, 0), vec3.fromValues(800, 300, 2500), mockStrawMaterial)
      ])()
    )

    config = createMockInfillConfig()
  })

  describe('basic functionality', () => {
    it('should create straw infill when no stands are specified', () => {
      const position = vec3.fromValues(100, 0, 0)
      const size = vec3.fromValues(800, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(0)
      expect(elements.some(e => e.id === ('straw-1' as any))).toBe(true)
    })

    it('should create start post when startsWithStand is true', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create end post when endsWithStand is true', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create both start and end posts when both stands are true', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1600, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, true, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThanOrEqual(2)
    })

    it('should generate measurements for post spacing', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { measurements } = aggregateResults(results)

      expect(measurements.length).toBeGreaterThan(0)
      expect(measurements[0].tags).toContain(TAG_POST_SPACING)
      expect((measurements[0] as any).size[0]).toBe(800) // maxPostSpacing
    })
  })

  describe('error conditions', () => {
    it('should generate error when not enough space for a post with start stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(30, 300, 2500) // Less than post width
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when not enough space for a post with end stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(30, 300, 2500) // Less than post width
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, false, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when space for more than one post but not enough for two', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(100, 300, 2500) // More than one post width but less than 2
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, true, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Space for more than one post, but not enough for two')
    })

    it('should generate warning when not enough vertical space for straw', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 300, 50) // Less than minStrawSpace
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })

    it('should generate warning when not enough space for infilling straw', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(50, 300, 2500) // Less than minStrawSpace for bale width
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.description === 'Not enough space for infilling straw')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle exactly post width with start stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(60, 300, 2500) // Exactly post width
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(area, config.posts)
      expect(elements).toHaveLength(1)
    })

    it('should handle exactly post width with end stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(60, 300, 2500) // Exactly post width
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(area, config.posts)
      expect(elements).toHaveLength(1)
    })

    it('should handle zero dimensions gracefully', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(0, 0, 0)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { elements, errors } = aggregateResults(results)

      expect(elements).toHaveLength(0)
      expect(errors).toHaveLength(0)
    })

    it('should handle startAtEnd parameter correctly', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config, false, false, true)]
      const { elements } = aggregateResults(results)

      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('configuration variations', () => {
    it('should work with double post configuration', () => {
      const doublePostConfig: PostConfig = {
        type: 'double',
        width: 60,
        thickness: 120,
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const config = createMockInfillConfig({
        posts: doublePostConfig
      })

      const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500))

      const results = [...infillWallArea(area, config, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(
        expect.objectContaining({
          position: vec3.fromValues(0, 0, 0),
          size: vec3.fromValues(60, 300, 2500)
        }),
        doublePostConfig
      )
    })

    it('should work with different desiredPostSpacing', () => {
      const config = createMockInfillConfig({
        desiredPostSpacing: 600
      })

      const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500))

      const results = [...infillWallArea(area, config)]
      const { measurements } = aggregateResults(results)

      expect(measurements.length).toBeGreaterThan(0)
      expect((measurements[0] as any).size[0]).toBe(600) // Updated desiredPostSpacing
    })

    it('should work with different minStrawSpace', () => {
      const config = createMockInfillConfig({
        minStrawSpace: 100
      })

      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 300, 90) // Between old and new minStrawSpace
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })
  })

  describe('recursive infill behavior', () => {
    it('should create multiple posts and straw sections for large areas', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(2000, 300, 2500) // Large enough for multiple sections
      const area = new WallConstructionArea(position, size)

      // Mock multiple calls to constructPost and constructStraw
      mockConstructPost.mockReturnValue(
        createMockGenerator([
          createMockElement('post', vec3.fromValues(0, 0, 0), vec3.fromValues(60, 300, 2500), mockWoodMaterial)
        ])()
      )
      mockConstructStraw.mockReturnValue(
        createMockGenerator([
          createMockElement('straw', vec3.fromValues(0, 0, 0), vec3.fromValues(800, 300, 2500), mockStrawMaterial)
        ])()
      )

      const results = [...infillWallArea(area, config)]
      const { elements } = aggregateResults(results)

      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1) // Should have multiple elements
    })

    it('should alternate straw placement based on atStart parameter', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1500, 300, 2500)
      const area = new WallConstructionArea(position, size)

      const results = [...infillWallArea(area, config)]
      aggregateResults(results)

      expect(mockConstructStraw).toHaveBeenCalled()
      // Verify that straw is placed at correct positions (would need to check call arguments)
    })
  })
})

describe('assembly.construct', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock segmentedWallConstruction to call our wall and opening construction functions
    mockSegmentedWallConstruction.mockImplementation(
      function* (wall, _perimeter, _storeyContext, _layers, wallConstruction, openingConstruction, _padding) {
        const wallArea = new WallConstructionArea(vec3.fromValues(0, 30, 60), vec3.fromValues(3000, 220, 2380))
        // Simulate calling wall construction
        yield* wallConstruction(wallArea, true, true, false)

        // Simulate calling opening construction if there are openings
        if (wall.openings.length > 0) {
          const openingArea = new WallConstructionArea(vec3.fromValues(1000, 30, 60), vec3.fromValues(800, 220, 2380))
          yield* openingConstruction(openingArea, -60, wall.openings)
        }
      }
    )

    // Mock the construction functions
    mockConstructPost.mockReturnValue(
      createMockGenerator([
        createMockElement('post', vec3.fromValues(0, 0, 0), vec3.fromValues(60, 300, 2500), mockWoodMaterial)
      ])()
    )
    mockConstructStraw.mockReturnValue(
      createMockGenerator([
        createMockElement('straw', vec3.fromValues(0, 0, 0), vec3.fromValues(800, 300, 2500), mockStrawMaterial)
      ])()
    )
    mockConstructOpeningFrame.mockReturnValue(
      createMockGenerator([
        createMockElement('opening', vec3.fromValues(0, 0, 0), vec3.fromValues(800, 300, 1200), mockHeaderMaterial)
      ])()
    )
  })

  describe('full wall construction', () => {
    const assembly = new InfillWallAssembly()
    let config: InfillWallConfig
    beforeEach(() => {
      config = {
        type: 'infill',
        ...createMockInfillConfig(),
        layers: createMockLayers(),
        openings: {
          padding: 15,
          headerThickness: 60,
          headerMaterial: mockHeaderMaterial,
          sillThickness: 60,
          sillMaterial: mockHeaderMaterial
        }
      }
    })

    it('should construct a complete infill wall with no openings', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

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
        15
      )
    })

    it('should construct infill wall with openings', () => {
      const opening = {
        id: createOpeningId(),
        type: 'window' as const,
        offsetFromStart: 1000,
        width: 800,
        height: 1200,
        sillHeight: 900
      }
      const wall = createMockWall('test-wall', 3000, 300, [opening])
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })

    it('should propagate errors and warnings from infill construction', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      // Mock segmented construction to return errors/warnings
      const mockError = 'Test error'
      const mockWarning = 'Test warning'
      const mockElement = createMockElement(
        'test',
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(100, 100, 100),
        mockWoodMaterial
      )

      mockSegmentedWallConstruction.mockReturnValue(
        createMockGenerator([mockElement], [], [mockError], [mockWarning])()
      )

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.errors[0].description).toBe(mockError)
      expect(result.warnings[0].description).toBe(mockWarning)
    })

    it('should include measurements in the result', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const mockMeasurement = {
        startPoint: vec3.fromValues(0, 0, 0),
        endPoint: vec3.fromValues(800, 0, 0),
        label: '800mm',
        tags: [TAG_POST_SPACING],
        groupKey: 'post-spacing',
        offset: 1
      }

      const mockElement = createMockElement(
        'test',
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(100, 100, 100),
        mockWoodMaterial
      )
      mockSegmentedWallConstruction.mockReturnValue(createMockGenerator([mockElement], [mockMeasurement])())

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

      expect(result.measurements).toHaveLength(1)
      expect(result.measurements[0]).toBe(mockMeasurement)
    })

    it('should calculate correct bounds from all elements', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500

      const result = assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

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
      const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500))

      assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

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
      const area = new WallConstructionArea(vec3.fromValues(1000, 30, 60), vec3.fromValues(800, 220, 2380))

      assembly.construct(wall, perimeter, createMockStoreyContext(floorHeight), config)

      const openingConstructionFn = mockSegmentedWallConstruction.mock.calls[0][5]
      expect(openingConstructionFn).toBeDefined()

      // Test that the opening construction function works
      const mockOpening = {
        id: createOpeningId(),
        type: 'window' as const,
        offsetFromStart: 0,
        width: 800,
        height: 1200,
        sillHeight: 900
      }

      const result = [...openingConstructionFn(area, -60, [mockOpening])]
      expect(result.length).toBeGreaterThan(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })
  })
})
