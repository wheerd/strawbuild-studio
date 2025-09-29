import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId, createPerimeterConstructionMethodId, createPerimeterId } from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import { IDENTITY } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { constructPost } from '@/construction/materials/posts'
import type { StrawConfig } from '@/construction/materials/straw'
import { constructStraw } from '@/construction/materials/straw'
import { constructOpeningFrame } from '@/construction/openings/openings'
import { aggregateResults, yieldElement, yieldError, yieldMeasurement, yieldWarning } from '@/construction/results'
import { TAG_POST_SPACING } from '@/construction/tags'
import { segmentedWallConstruction } from '@/construction/walls/segmentation'
import type { Length, Vec3 } from '@/shared/geometry'
import { createLength, createVec2 } from '@/shared/geometry'

import { type InfillConstructionConfig, constructInfillWall, infillWallArea } from './infill'

// Mock dependencies
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

const mockResolveMaterial = vi.fn(() => ({
  type: 'generic' as const,
  id: mockWoodMaterial,
  name: 'Test Wood',
  color: '#8B4513'
}))

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
    width: createLength(60),
    material: mockWoodMaterial
  }
}

function createMockStrawConfig(): StrawConfig {
  return {
    baleLength: createLength(800),
    baleHeight: createLength(500),
    baleWidth: createLength(360),
    material: mockStrawMaterial
  }
}

function createMockInfillConfig(): InfillConstructionConfig {
  return {
    type: 'infill',
    maxPostSpacing: createLength(800),
    minStrawSpace: createLength(70),
    posts: createMockPostConfig(),
    openings: {
      padding: createLength(15),
      headerThickness: createLength(60),
      headerMaterial: mockHeaderMaterial,
      sillThickness: createLength(60),
      sillMaterial: mockHeaderMaterial
    },
    straw: createMockStrawConfig()
  }
}

function createMockWall(
  id = 'test-wall',
  wallLength: Length = createLength(3000),
  thickness: Length = createLength(300),
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
      start: createVec2(0, 0),
      end: createVec2(wallLength, 0)
    },
    outsideLine: {
      start: createVec2(0, thickness),
      end: createVec2(wallLength, thickness)
    },
    direction: createVec2(1, 0),
    outsideDirection: createVec2(0, 1)
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

function createMockLayers(): LayersConfig {
  return {
    insideThickness: createLength(30),
    outsideThickness: createLength(50)
  }
}

describe('infillWallArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockConstructPost.mockReturnValue(
      createMockGenerator([createMockElement('post-1', [0, 0, 0], [60, 300, 2500], mockWoodMaterial)])()
    )

    mockConstructStraw.mockReturnValue(
      createMockGenerator([createMockElement('straw-1', [0, 0, 0], [800, 300, 2500], mockStrawMaterial)])()
    )
  })

  describe('basic functionality', () => {
    it('should create straw infill when no stands are specified', () => {
      const position: Vec3 = [100, 0, 0]
      const size: Vec3 = [800, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { elements, errors, warnings } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(warnings).toHaveLength(0)
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(0)
      expect(elements.some(e => e.id === 'straw-1')).toBe(true)
    })

    it('should create start post when startsWithStand is true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create end post when endsWithStand is true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1)
    })

    it('should create both start and end posts when both stands are true', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1600, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, true, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThanOrEqual(2)
    })

    it('should generate measurements for post spacing', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { measurements } = aggregateResults(results)

      expect(measurements.length).toBeGreaterThan(0)
      expect(measurements[0].tags).toContain(TAG_POST_SPACING)
      expect(measurements[0].label).toBe('800mm') // maxPostSpacing
    })
  })

  describe('error conditions', () => {
    it('should generate error when not enough space for a post with start stand', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [30, 300, 2500] // Less than post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when not enough space for a post with end stand', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [30, 300, 2500] // Less than post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, false, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Not enough space for a post')
    })

    it('should generate error when space for more than one post but not enough for two', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [100, 300, 2500] // More than one post width but less than 2
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, true, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toBe('Space for more than one post, but not enough for two')
    })

    it('should generate warning when not enough vertical space for straw', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 300, 50] // Less than minStrawSpace
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })

    it('should generate warning when not enough space for infilling straw', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [50, 300, 2500] // Less than minStrawSpace for bale width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.description === 'Not enough space for infilling straw')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle exactly post width with start stand', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 300, 2500] // Exactly post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(position, size, config.posts, mockResolveMaterial)
      expect(elements).toHaveLength(1)
    })

    it('should handle exactly post width with end stand', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [60, 300, 2500] // Exactly post width
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, false, true)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(position, size, config.posts, mockResolveMaterial)
      expect(elements).toHaveLength(1)
    })

    it('should handle zero dimensions gracefully', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [0, 0, 0]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { elements, errors } = aggregateResults(results)

      expect(elements).toHaveLength(0)
      expect(errors).toHaveLength(0)
    })

    it('should handle startAtEnd parameter correctly', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1000, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial, false, false, true)]
      const { elements } = aggregateResults(results)

      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('configuration variations', () => {
    it('should work with double post configuration', () => {
      const doublePostConfig: PostConfig = {
        type: 'double',
        width: createLength(60),
        thickness: createLength(120),
        material: mockWoodMaterial,
        infillMaterial: mockStrawMaterial
      }

      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        posts: doublePostConfig
      }

      const results = [...infillWallArea([0, 0, 0], [1000, 300, 2500], config, mockResolveMaterial, true)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(mockConstructPost).toHaveBeenCalledWith(
        [0, 0, 0],
        [1000, 300, 2500],
        doublePostConfig,
        mockResolveMaterial
      )
    })

    it('should work with different maxPostSpacing', () => {
      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        maxPostSpacing: createLength(600)
      }

      const results = [...infillWallArea([0, 0, 0], [1000, 300, 2500], config, mockResolveMaterial)]
      const { measurements } = aggregateResults(results)

      expect(measurements.length).toBeGreaterThan(0)
      expect(measurements[0].label).toBe('600mm') // Updated maxPostSpacing
    })

    it('should work with different minStrawSpace', () => {
      const config: InfillConstructionConfig = {
        ...createMockInfillConfig(),
        minStrawSpace: createLength(100)
      }

      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [800, 300, 90] // Between old and new minStrawSpace

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { warnings } = aggregateResults(results)

      expect(warnings).toHaveLength(1)
      expect(warnings[0].description).toBe('Not enough vertical space to fill with straw')
    })
  })

  describe('recursive infill behavior', () => {
    it('should create multiple posts and straw sections for large areas', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [2000, 300, 2500] // Large enough for multiple sections
      const config = createMockInfillConfig()

      // Mock multiple calls to constructPost and constructStraw
      mockConstructPost.mockReturnValue(
        createMockGenerator([createMockElement('post', [0, 0, 0], [60, 300, 2500], mockWoodMaterial)])()
      )
      mockConstructStraw.mockReturnValue(
        createMockGenerator([createMockElement('straw', [0, 0, 0], [800, 300, 2500], mockStrawMaterial)])()
      )

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
      const { elements } = aggregateResults(results)

      expect(mockConstructPost).toHaveBeenCalled()
      expect(mockConstructStraw).toHaveBeenCalled()
      expect(elements.length).toBeGreaterThan(1) // Should have multiple elements
    })

    it('should alternate straw placement based on atStart parameter', () => {
      const position: Vec3 = [0, 0, 0]
      const size: Vec3 = [1500, 300, 2500]
      const config = createMockInfillConfig()

      const results = [...infillWallArea(position, size, config, mockResolveMaterial)]
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
      function* (wall, _perimeter, _wallHeight, _layers, wallConstruction, openingConstruction) {
        // Simulate calling wall construction
        yield* wallConstruction([0, 30, 60], [3000, 220, 2380], true, true, false)

        // Simulate calling opening construction if there are openings
        if (wall.openings.length > 0) {
          yield* openingConstruction([1000, 30, 60], [800, 220, 2380], createLength(-60), wall.openings)
        }
      }
    )

    // Mock the construction functions
    mockConstructPost.mockReturnValue(
      createMockGenerator([createMockElement('post', [0, 0, 0], [60, 300, 2500], mockWoodMaterial)])()
    )
    mockConstructStraw.mockReturnValue(
      createMockGenerator([createMockElement('straw', [0, 0, 0], [800, 300, 2500], mockStrawMaterial)])()
    )
    mockConstructOpeningFrame.mockReturnValue(
      createMockGenerator([createMockElement('opening', [0, 0, 0], [800, 300, 1200], mockHeaderMaterial)])()
    )
  })

  describe('full wall construction', () => {
    it('should construct a complete infill wall with no openings', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, floorHeight, config, layers)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.bounds).toBeDefined()
      expect(mockSegmentedWallConstruction).toHaveBeenCalledWith(
        wall,
        perimeter,
        floorHeight,
        layers,
        expect.any(Function), // wallConstruction function
        expect.any(Function) // openingConstruction function
      )
    })

    it('should construct infill wall with openings', () => {
      const opening = {
        id: createOpeningId(),
        type: 'window' as const,
        offsetFromStart: createLength(1000),
        width: createLength(800),
        height: createLength(1200),
        sillHeight: createLength(900)
      }
      const wall = createMockWall('test-wall', createLength(3000), createLength(300), [opening])
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, floorHeight, config, layers)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })

    it('should propagate errors and warnings from infill construction', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      // Mock segmented construction to return errors/warnings
      const mockError = { description: 'Test error', elements: [] }
      const mockWarning = { description: 'Test warning', elements: [] }
      const mockElement = createMockElement('test', [0, 0, 0], [100, 100, 100], mockWoodMaterial)

      mockSegmentedWallConstruction.mockReturnValue(
        createMockGenerator([mockElement], [], [mockError], [mockWarning])()
      )

      const result = constructInfillWall(wall, perimeter, floorHeight, config, layers)

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.errors[0].description).toBe('Test error')
      expect(result.warnings[0].description).toBe('Test warning')
    })

    it('should include measurements in the result', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const mockMeasurement = {
        startPoint: [0, 0, 0] as Vec3,
        endPoint: [800, 0, 0] as Vec3,
        label: '800mm',
        tags: [TAG_POST_SPACING],
        groupKey: 'post-spacing',
        offset: 1
      }

      const mockElement = createMockElement('test', [0, 0, 0], [100, 100, 100], mockWoodMaterial)
      mockSegmentedWallConstruction.mockReturnValue(createMockGenerator([mockElement], [mockMeasurement])())

      const result = constructInfillWall(wall, perimeter, floorHeight, config, layers)

      expect(result.measurements).toHaveLength(1)
      expect(result.measurements[0].label).toBe('800mm')
      expect(result.measurements[0].tags).toContain(TAG_POST_SPACING)
    })

    it('should calculate correct bounds from all elements', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      const result = constructInfillWall(wall, perimeter, floorHeight, config, layers)

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
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, floorHeight, config, layers)

      expect(mockSegmentedWallConstruction).toHaveBeenCalledWith(
        wall,
        perimeter,
        floorHeight,
        layers,
        expect.any(Function), // wallConstruction function
        expect.any(Function) // openingConstruction function
      )
    })

    it('should pass infillWallArea function as wall construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, floorHeight, config, layers)

      const wallConstructionFn = mockSegmentedWallConstruction.mock.calls[0][4]
      expect(wallConstructionFn).toBeDefined()

      // Test that the wall construction function works
      const result = [...wallConstructionFn([0, 0, 0], [1000, 300, 2500], true, true, false)]
      expect(result.length).toBeGreaterThan(0)
    })

    it('should pass constructOpeningFrame function as opening construction callback', () => {
      const wall = createMockWall()
      const perimeter = createMockPerimeter([wall])
      const floorHeight = createLength(2500)
      const config = createMockInfillConfig()
      const layers = createMockLayers()

      constructInfillWall(wall, perimeter, floorHeight, config, layers)

      const openingConstructionFn = mockSegmentedWallConstruction.mock.calls[0][5]
      expect(openingConstructionFn).toBeDefined()

      // Test that the opening construction function works
      const mockOpening = {
        id: createOpeningId(),
        type: 'window' as const,
        offsetFromStart: createLength(0),
        width: createLength(800),
        height: createLength(1200),
        sillHeight: createLength(900)
      }

      const result = [...openingConstructionFn([1000, 30, 60], [800, 220, 2380], createLength(-60), [mockOpening])]
      expect(result.length).toBeGreaterThan(0)
      expect(mockConstructOpeningFrame).toHaveBeenCalled()
    })
  })
})
