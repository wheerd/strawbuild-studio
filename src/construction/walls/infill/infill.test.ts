import { vec2, vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId, createPerimeterConstructionMethodId, createPerimeterId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { WallLayersConfig } from '@/construction/config/types'
import { IDENTITY } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { constructPost } from '@/construction/materials/posts'
import type { StrawConfig } from '@/construction/materials/straw'
import { constructStraw } from '@/construction/materials/straw'
import { constructOpeningFrame } from '@/construction/openings/openings'
import { aggregateResults, yieldElement, yieldError, yieldMeasurement, yieldWarning } from '@/construction/results'
import { TAG_POST_SPACING } from '@/construction/tags'
import { type WallStoreyContext } from '@/construction/walls/segmentation'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import type { Length } from '@/shared/geometry'
import '@/shared/geometry'

import { type InfillConstructionConfig, constructInfillWall, infillWallArea } from './infill'

function createMockStoreyContext(storeyHeight: Length = 2500): WallStoreyContext {
  return {
    storeyHeight,
    floorTopOffset: 0,
    ceilingBottomOffset: 0
  }
}

// Mock dependencies
vi.mock('@/construction/floors', () => ({
  SLAB_CONSTRUCTION_METHODS: {
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

function createMockGenerator(elements: any[] = [], measurements: any[] = [], errors: any[] = [], warnings: any[] = []) {
  return function* () {
    for (const element of elements) {
      yield yieldElement(element)
    }
    for (const measurement of measurements) {
      yield yieldMeasurement(measurement)
    }
    for (const error of errors) {
      yield yieldError(error)
    }
    for (const warning of warnings) {
      yield yieldWarning(warning)
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

function createMockStrawConfig(): StrawConfig {
  return {
    baleLength: 800,
    baleHeight: 500,
    baleWidth: 360,
    material: mockStrawMaterial
  }
}

function createMockInfillConfig(): InfillConstructionConfig {
  return {
    type: 'infill',
    maxPostSpacing: 800,
    minStrawSpace: 70,
    posts: createMockPostConfig(),
    openings: {
      padding: 15,
      headerThickness: 60,
      headerMaterial: mockHeaderMaterial,
      sillThickness: 60,
      sillMaterial: mockHeaderMaterial
    },
    straw: createMockStrawConfig()
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
    constructionMethodId: createPerimeterConstructionMethodId(),
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
    walls,
    corners: []
  } as Perimeter
}

function createMockLayers(): WallLayersConfig {
  return {
    insideThickness: 30,
    outsideThickness: 50
  }
}

describe('infillWallArea', () => {
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
  })

  describe('basic functionality', () => {
    it('should create straw infill when no stands are specified', () => {
      const position = vec3.fromValues(100, 0, 0)
      const size = vec3.fromValues(800, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
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
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create end post when endsWithStand is true', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create both start and end posts when both stands are true', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1600, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, true, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThanOrEqual(2)
    })

    it('should generate measurements for post spacing', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
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
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when not enough space for a post with end stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(30, 300, 2500) // Less than post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, false, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when space for more than one post but not enough for two', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(100, 300, 2500) // More than one post width but less than 2
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, true, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Space for more than one post, but not enough for two')
    })

    it('should generate warning when not enough vertical space for straw', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 300, 50) // Less than minStrawSpace
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })

    it('should generate warning when not enough space for infilling straw', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(50, 300, 2500) // Less than minStrawSpace for bale width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.description === 'Not enough space for infilling straw')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle exactly post width with start stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(60, 300, 2500) // Exactly post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(position, size, config.posts)
      expect(elements).toHaveLength(1)
    })

    it('should handle exactly post width with end stand', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(60, 300, 2500) // Exactly post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(position, size, config.posts)
      expect(elements).toHaveLength(1)
    })

    it('should handle zero dimensions gracefully', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(0, 0, 0)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
      const { elements, errors } = aggregateResults(results)

      expect(elements).toHaveLength(0)
      expect(errors).toHaveLength(0)
    })

    it('should handle startAtEnd parameter correctly', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1000, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, false, false, true)]
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

      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        posts: doublePostConfig
      }

      const results = [...infillWallArea(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500), config, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(1000, 300, 2500),
        doublePostConfig
      )
    })

    it('should work with different maxPostSpacing', () => {
      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        maxPostSpacing: 600
      }

      const results = [...infillWallArea(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500), config)]
      const { measurements } = aggregateResults(results)

      expect(measurements.length).toBeGreaterThan(0)
      expect((measurements[0] as any).size[0]).toBe(600) // Updated maxPostSpacing
    })

    it('should work with different minStrawSpace', () => {
      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        minStrawSpace: 100
      }

      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(800, 300, 90) // Between old and new minStrawSpace

      const results = [...infillWallArea(position, size, config)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })
  })

  describe('recursive infill behavior', () => {
    it('should create multiple posts and straw sections for large areas', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(2000, 300, 2500) // Large enough for multiple sections
      const config = createMockInfillConfig()

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

      const results = [...infillWallArea(position, size, config)]
      const { elements } = aggregateResults(results)

      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1) // Should have multiple elements
    })

    it('should alternate straw placement based on atStart parameter', () => {
      const position = vec3.fromValues(0, 0, 0)
      const size = vec3.fromValues(1500, 300, 2500)
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config)]
      aggregateResults(results)

      expect(mockConstructStraw).toHaveBeenCalled()
      // Verify that straw is placed at correct positions (would need to check call arguments)
    })
  })
})

describe('constructInfillWall', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock segmentedWallConstruction to call our wall and opening construction functions
    mockSegmentedWallConstruction.mockImplementation(
      function* (wall, _perimeter, _storeyContext, _layers, wallConstruction, openingConstruction) {
        // Simulate calling wall construction
        yield* wallConstruction(vec3.fromValues(0, 30, 60), vec3.fromValues(3000, 220, 2380), true, true, false)

        // Simulate calling opening construction if there are openings
        if (wall.openings.length > 0) {
          yield* openingConstruction(vec3.fromValues(1000, 30, 60), vec3.fromValues(800, 220, 2380), -60, wall.openings)
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
    it('should construct a complete infill wall with no openings', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.bounds).toBeDefined()
      expect(mockSegmentedWallConstruction).toHaveBeenCalledWith(
        wall,
        perimeter,
        createMockStoreyContext(floorHeight),
        layers,
        expect.any(Function), // wallConstruction function
        expect.any(Function) // openingConstruction function
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
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })

    it('should propagate errors and warnings from infill construction', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      // Mock segmented construction to return errors/warnings
      const mockError = { description: 'Test error', elements: [] }
      const mockWarning = { description: 'Test warning', elements: [] }
      const mockElement = createMockElement(
        'test',
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(100, 100, 100),
        mockWoodMaterial
      )

      mockSegmentedWallConstruction.mockReturnValue(
        createMockGenerator([mockElement], [], [mockError], [mockWarning])()
      )

      const result = constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.errors[0]).toBe(mockError)
      expect(result.warnings[0]).toBe(mockWarning)
    })

    it('should include measurements in the result', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

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

      const result = constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(result.measurements).toHaveLength(1)
      expect(result.measurements[0]).toBe(mockMeasurement)
    })

    it('should calculate correct bounds from all elements', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(result.bounds).toBeDefined()
      expect(result.bounds.min).toBeDefined()
      expect(result.bounds.max).toBeDefined()
      // Bounds should encompass all elements
      expect(result.bounds.min[0]).toBeLessThanOrEqual(result.bounds.max[0])
      expect(result.bounds.min[1]).toBeLessThanOrEqual(result.bounds.max[1])
      expect(result.bounds.min[2]).toBeLessThanOrEqual(result.bounds.max[2])
    })
  })

  describe('integration with segmentation', () => {
    it('should pass correct parameters to segmentedWallConstruction', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      expect(mockSegmentedWallConstruction).toHaveBeenCalledWith(
        wall,
        perimeter,
        createMockStoreyContext(floorHeight),
        layers,
        expect.any(Function), // wallConstruction function
        expect.any(Function) // openingConstruction function
      )
    })

    it('should pass infillWallArea function as wall construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

      const wallConstructionFn = mockSegmentedWallConstruction.mock.calls[0][4]
      expect(wallConstructionFn).toBeDefined()

      // Test that the wall construction function works
      const result = [
        ...wallConstructionFn(vec3.fromValues(0, 0, 0), vec3.fromValues(1000, 300, 2500), true, true, false)
      ]
      expect(result.length).toBeGreaterThan(0)
    })

    it('should pass constructOpeningFrame function as opening construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = 2500
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, createMockStoreyContext(floorHeight), config, layers)

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

      const result = [
        ...openingConstructionFn(vec3.fromValues(1000, 30, 60), vec3.fromValues(800, 220, 2380), -60, [mockOpening])
      ]
      expect(result.length).toBeGreaterThan(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })
  })
})
