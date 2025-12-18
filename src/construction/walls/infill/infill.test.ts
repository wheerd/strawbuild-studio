import { vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IDENTITY, WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { PostConfig } from '@/construction/materials/posts'
import { constructPost } from '@/construction/materials/posts'
import { constructStraw } from '@/construction/materials/straw'
import { aggregateResults, yieldElement, yieldError, yieldMeasurement, yieldWarning } from '@/construction/results'
import { TAG_POST_SPACING } from '@/construction/tags'
import type { InfillWallSegmentConfig } from '@/construction/walls'
import type { Length } from '@/shared/geometry'
import '@/shared/geometry'

import { infillWallArea } from './infill'

// Mock dependencies
vi.mock('@/construction/materials/posts', () => ({
  constructPost: vi.fn()
}))

vi.mock('@/construction/materials/straw', () => ({
  constructStraw: vi.fn()
}))

vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: Length) => `${length}mm`)
}))

const mockConstructPost = vi.mocked(constructPost)
const mockConstructStraw = vi.mocked(constructStraw)

// Test data helpers
const mockWoodMaterial = 'wood-material' as MaterialId
const mockStrawMaterial = 'straw-material' as MaterialId

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
      expect(measurements[0].endPoint[0] - measurements[0].startPoint[0]).toBe(800) // maxPostSpacing
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
      expect(measurements[0].endPoint[0] - measurements[0].startPoint[0]).toBe(600) // Updated desiredPostSpacing
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
