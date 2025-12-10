import { vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId } from '@/building/model/ids'
import type { Opening } from '@/building/model/model'
import { type ConstructionElement, type GroupOrElement, createCuboidElement } from '@/construction/elements'
import { WallConstructionArea } from '@/construction/geometry'
import { createMaterialId } from '@/construction/materials/material'
import type { RawMeasurement } from '@/construction/measurements'
import { type ConstructionResult, aggregateResults, yieldElement } from '@/construction/results'
import {
  TAG_HEADER,
  TAG_HEADER_HEIGHT,
  TAG_OPENING_DOOR,
  TAG_OPENING_HEIGHT,
  TAG_OPENING_WIDTH,
  TAG_OPENING_WINDOW,
  TAG_SILL,
  TAG_SILL_HEIGHT,
  type Tag
} from '@/construction/tags'
import type { InfillMethod } from '@/construction/walls'
import type { OpeningConstructionDimensions } from '@/shared/utils/openingDimensions'

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

const createTestOpening = (overrides: Partial<OpeningConstructionDimensions> = {}): OpeningConstructionDimensions => ({
  id: createOpeningId(),
  type: 'window',
  centerOffsetFromWallStart: 1000,
  offsetFromStart: 600,
  width: 800,
  height: 1200,
  sillHeight: 900,
  ...overrides
})

const createTestConfig = (overrides: Partial<SimpleOpeningConfig> = {}): SimpleOpeningConfig => ({
  type: 'simple',
  padding: 15,
  headerThickness: 60,
  headerMaterial: createMaterialId(),
  sillThickness: 60,
  sillMaterial: createMaterialId(),
  ...overrides
})

const createTestOpeningArea = (opening: Opening): WallConstructionArea =>
  new WallConstructionArea(
    vec3.fromValues(opening.centerOffsetFromWallStart, 0, 0),
    vec3.fromValues(opening.width, 360, 2500)
  )

// Helper to create mock generator for infillWallArea
const createMockInfillGenerator = function* (numElements = 2): Generator<ConstructionResult> {
  for (let i = 0; i < numElements; i++) {
    const offset = vec3.fromValues(100 * i, 0, 0)
    const size = vec3.fromValues(100, 360, 500)
    const element = createCuboidElement(createMaterialId(), offset, size)
    yield* yieldElement(element)
  }
}

const mockInfillMethod = vi.fn<InfillMethod>(_area => createMockInfillGenerator())

describe('SimpleOpeningAssembly', () => {
  const assembly = new SimpleOpeningAssembly()

  beforeEach(() => {
    mockInfillMethod.mockReset()
    mockInfillMethod.mockImplementation(_area => createMockInfillGenerator())
  })

  describe('basic opening construction', () => {
    it('creates header and sill for window with sill height', () => {
      const opening = createTestOpening({
        sillHeight: 900,
        height: 1200
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig()

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
      const { elements, errors, areas } = aggregateResults(results)

      expect(errors).toHaveLength(0)
      expect(elements.length).toBeGreaterThan(3)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))
      const window = areas.find(a => a.tags?.includes(TAG_OPENING_WINDOW))

      expect(header).toBeDefined()
      expect(sill).toBeDefined()
      expect(window).toBeDefined()
    })

    it('generates measurements', () => {
      const opening = createTestOpening({
        sillHeight: 800,
        height: 1200,
        width: 1000
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig()

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
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
      expect((openingWidthMeasurements[0] as any).size[0]).toBe(1000) // width (AutoMeasurement)
      expect((sillHeightMeasurements[0] as any).label).toBe('800mm') // sillHeight (DirectMeasurement)
      expect((headerHeightMeasurements[0] as any).label).toBe('2000mm') // sillHeight + height (DirectMeasurement)
      expect((openingHeightMeasurements[0] as any).label).toBe('1200mm') // height (DirectMeasurement)
    })

    it('generates only header and opening width measurements for door', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: 0,
        height: 2000,
        width: 800
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig()

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
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
      expect((openingWidthMeasurements[0] as any).size[0]).toBe(800) // width (AutoMeasurement)
      expect((headerHeightMeasurements[0] as any).label).toBe('2000mm') // height (DirectMeasurement)
    })

    it('creates only header for door without sill height', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: 0,
        height: 2000
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig()

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
      const { elements, errors, areas } = aggregateResults(results)

      expect(errors).toHaveLength(0)

      const header = elements.find(el => hasTag(el, TAG_HEADER))
      const sill = elements.find(el => hasTag(el, TAG_SILL))
      const door = areas.find(a => a.tags?.includes(TAG_OPENING_DOOR))

      expect(header).toBeDefined()
      expect(sill).toBeUndefined()
      expect(door).toBeDefined()
    })
  })

  describe('infill integration', () => {
    it('calls the infill method with the wall above the header', () => {
      mockInfillMethod.mockImplementationOnce(area => {
        expect(area.position).toEqual(vec3.fromValues(0, 0, 1060))
        expect(area.size).toEqual(vec3.fromValues(800, 360, 1440))
        return createMockInfillGenerator(0)
      })

      const opening = createTestOpening({
        centerOffsetFromWallStart: 0,
        sillHeight: 0,
        width: 800,
        height: 1000
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })

      Array.from(assembly.construct(area, [opening], 0, config, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledTimes(1)
    })

    it('calls the infill method with the wall below the sill', () => {
      mockInfillMethod.mockImplementationOnce(area => {
        expect(area.position).toEqual(vec3.fromValues(0, 0, 0))
        expect(area.size).toEqual(vec3.fromValues(800, 360, 540))
        return createMockInfillGenerator(0)
      })

      const opening = createTestOpening({
        centerOffsetFromWallStart: 0,
        sillHeight: 600,
        width: 800,
        height: 1900
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })

      Array.from(assembly.construct(area, [opening], 0, config, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('returns error when header does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 2360,
        height: 100
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig({
        headerThickness: 100
      })

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Header does not fit')
    })

    it('returns error when sill does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 50,
        height: 1200
      })
      const area = createTestOpeningArea(opening)
      const config = createTestConfig({
        sillThickness: 100
      })

      const results = [...assembly.construct(area, [opening], 0, config, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Sill does not fit')
    })
  })
})
