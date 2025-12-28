import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type ConstructionElement, type GroupOrElement, createCuboidElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { createMaterialId } from '@/construction/materials/material'
import type { RawMeasurement } from '@/construction/measurements'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import {
  TAG_HEADER,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_SILL,
  TAG_SILL_HEIGHT,
  type Tag
} from '@/construction/tags'
import type { InfillMethod } from '@/construction/walls'
import { type Length, newVec3 } from '@/shared/geometry'

import { SimpleOpeningAssembly } from './simple'
import type { SimpleOpeningConfig } from './types'

// Mock the formatLength utility
vi.mock('@/shared/utils/formatting', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

// Helper function to check if an element has a specific tag
const hasTag = (element: GroupOrElement, tag: Tag): boolean => {
  const constructionElement = element as ConstructionElement
  return constructionElement.tags?.some(t => t.id === tag.id) ?? false
}

// Helper function to check if a measurement has a specific tag
const measurementHasTag = (measurement: RawMeasurement, tag: Tag): boolean => {
  return measurement.tags?.some(t => t.id === tag.id) ?? false
}

const createTestArea = (start: Length = 1000, width: Length = 800): WallConstructionArea =>
  new WallConstructionArea(newVec3(start, 0, 0), newVec3(width, 360, 2500))

const createTestConfig = (overrides: Partial<SimpleOpeningConfig> = {}): SimpleOpeningConfig => ({
  type: 'simple',
  padding: 15,
  headerThickness: 60,
  headerMaterial: createMaterialId(),
  sillThickness: 60,
  sillMaterial: createMaterialId(),
  ...overrides
})

// Helper to create mock generator for infillWallArea
const createMockInfillGenerator = function* (numElements = 2): Generator<ConstructionResult> {
  for (let i = 0; i < numElements; i++) {
    const offset = newVec3(100 * i, 0, 0)
    const size = newVec3(100, 360, 500)
    const element = createCuboidElement(createMaterialId(), offset, size)
    yield* yieldElement(element)
  }
}

const mockInfillMethod = vi.fn<InfillMethod>(_area => createMockInfillGenerator())

describe('SimpleOpeningAssembly', () => {
  beforeEach(() => {
    mockInfillMethod.mockReset()
    mockInfillMethod.mockImplementation(_area => createMockInfillGenerator())
  })

  describe('basic opening construction', () => {
    it('creates header and sill for window with sill height', () => {
      const area = createTestArea()
      const config = createTestConfig()
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, 2000, 800, mockInfillMethod)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(3)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))

      expect(header).toBeDefined()
      expect(sill).toBeDefined()
    })

    it('generates measurements', () => {
      const area = createTestArea(100, 1000)
      const config = createTestConfig()
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, 2000, 800, mockInfillMethod)]
      const { measurements } = aggregateResults(results)

      // Should generate measurements inline
      expect(measurements.length).toBeGreaterThan(0)

      // Check specific measurement types
      const openingWidthMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_WIDTH))
      const headerHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_HEADER_HEIGHT))
      const sillHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_SILL_HEIGHT))
      const openingHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_HEIGHT))

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(1)
      expect(openingHeightMeasurements).toHaveLength(1)

      // Verify measurement values
      expect(openingWidthMeasurements[0].endPoint[0] - openingWidthMeasurements[0].startPoint[0]).toBe(1000) // width (AutoMeasurement)
      expect((sillHeightMeasurements[0] as any).length).toBe(800) // sillHeight (DirectMeasurement)
      expect((headerHeightMeasurements[0] as any).length).toBe(2000) // sillHeight + height (DirectMeasurement)
      expect((openingHeightMeasurements[0] as any).length).toBe(1200) // height (DirectMeasurement)
    })

    it('generates only header and opening width measurements for door', () => {
      const area = createTestArea()
      const config = createTestConfig()
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, 2000, 0, mockInfillMethod)]
      const { measurements } = aggregateResults(results)

      // Should generate fewer measurements for door (no sill)
      const openingWidthMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_WIDTH))
      const headerHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_HEADER_HEIGHT))
      const sillHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_SILL_HEIGHT))
      const openingHeightMeasurements = measurements.filter(m => measurementHasTag(m, TAG_OPENING_HEIGHT))

      expect(openingWidthMeasurements).toHaveLength(1)
      expect(headerHeightMeasurements).toHaveLength(1)
      expect(sillHeightMeasurements).toHaveLength(0) // No sill for doors
      expect(openingHeightMeasurements).toHaveLength(0) // No opening height without sill

      // Verify measurement values
      expect(openingWidthMeasurements[0].endPoint[0] - openingWidthMeasurements[0].startPoint[0]).toBe(800) // width (AutoMeasurement)
      expect((headerHeightMeasurements[0] as any).length).toBe(2000) // height (DirectMeasurement)
    })

    it('creates only header for door without sill height', () => {
      const area = createTestArea()
      const config = createTestConfig()
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, 2000, 0, mockInfillMethod)]
      const { elements, errors } = aggregateResults(results)

      expect(errors).toHaveLength(0)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))

      expect(header).toBeDefined()
      expect(sill).toBeUndefined()
    })
  })

  describe('infill integration', () => {
    it('calls the infill method with the wall above the header', () => {
      const area = createTestArea()
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })
      const assembly = new SimpleOpeningAssembly(config)

      Array.from(assembly.construct(area, 2000, 800, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          position: newVec3(area.position[0], area.position[1], 2000 + 60),
          size: newVec3(area.size[0], area.size[1], 500 - 60)
        })
      )
    })

    it('calls the infill method with the wall below the sill', () => {
      const area = createTestArea()
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })
      const assembly = new SimpleOpeningAssembly(config)

      Array.from(assembly.construct(area, 2000, 800, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          position: area.position,
          size: newVec3(area.size[0], area.size[1], 800 - 60)
        })
      )
    })
  })

  describe('error handling', () => {
    it('returns error when header does not fit', () => {
      const area = createTestArea()
      const config = createTestConfig({
        headerThickness: 100
      })
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, area.size[2] - 50, 800, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Header does not fit')
    })

    it('returns error when sill does not fit', () => {
      const area = createTestArea()
      const config = createTestConfig({
        sillThickness: 100
      })
      const assembly = new SimpleOpeningAssembly(config)

      const results = [...assembly.construct(area, 2000, 50, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Sill does not fit')
    })
  })
})
