import { vec3 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createOpeningId } from '@/building/model/ids'
import type { Opening } from '@/building/model/model'
import { type ConstructionElement, type GroupOrElement, createConstructionElement } from '@/construction/elements'
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
import { infillWallArea } from '@/construction/walls/infill/infill'
import type { WallSegment3D } from '@/construction/walls/segmentation'

import { type OpeningConstructionConfig, constructOpeningFrame } from './openings'

// Mock the infill module
vi.mock('@/construction/walls/infill/infill', () => ({
  infillWallArea: vi.fn()
}))

// Mock the formatLength utility
vi.mock('@/shared/utils/formatLength', () => ({
  formatLength: vi.fn((length: number) => `${length}mm`) // Mock to return simple format for tests
}))

const mockInfillWallArea = vi.mocked(infillWallArea)

// Helper function to check if an element has a specific tag
const hasTag = (element: GroupOrElement, tag: Tag): boolean => {
  const constructionElement = element as ConstructionElement
  return constructionElement.tags?.some(t => t.id === tag.id) ?? false
}

// Helper function to check if a measurement has a specific tag
const measurementHasTag = (measurement: RawMeasurement, tag: Tag): boolean => {
  return measurement.tags?.some(t => t.id === tag.id) ?? false
}

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 1000,
  width: 800,
  height: 1200,
  sillHeight: 900,
  ...overrides
})

const createTestConfig = (overrides: Partial<OpeningConstructionConfig> = {}): OpeningConstructionConfig => ({
  padding: 15,
  headerThickness: 60,
  headerMaterial: createMaterialId(),
  sillThickness: 60,
  sillMaterial: createMaterialId(),
  ...overrides
})

const createTestOpeningSegment = (opening: Opening): WallSegment3D => ({
  type: 'opening',
  position: vec3.fromValues(opening.offsetFromStart, 0, 0),
  size: vec3.fromValues(opening.width, 360, 2500),
  openings: [opening]
})

// Helper to create mock generator for infillWallArea
const createMockInfillGenerator = function* (numElements = 2): Generator<ConstructionResult> {
  for (let i = 0; i < numElements; i++) {
    const offset = vec3.fromValues(100 * i, 0, 0)
    const size = vec3.fromValues(100, 360, 500)
    const element = createConstructionElement(createMaterialId(), {
      type: 'cuboid' as const,
      offset,
      size,
      bounds: {
        min: offset,
        max: vec3.add(vec3.create(), offset, size)
      }
    })
    yield yieldElement(element)
  }
}

const mockInfillMethod = vi.fn<InfillMethod>((_position, _size) => createMockInfillGenerator())

describe('constructOpeningFrame', () => {
  beforeEach(() => {
    mockInfillMethod.mockReset()
    mockInfillMethod.mockImplementation((_position, _size) => createMockInfillGenerator())
    mockInfillWallArea.mockReset()
    mockInfillWallArea.mockImplementation((..._args) => createMockInfillGenerator())
  })

  describe('basic opening construction', () => {
    it('creates header and sill for window with sill height', () => {
      const opening = createTestOpening({
        sillHeight: 900,
        height: 1200
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
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
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
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
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
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
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
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
      mockInfillMethod.mockImplementationOnce((position, size) => {
        expect(position).toEqual(vec3.fromValues(0, 0, 1060))
        expect(size).toEqual(vec3.fromValues(800, 360, 1440))
        return createMockInfillGenerator(0)
      })

      const opening = createTestOpening({
        offsetFromStart: 0,
        sillHeight: 0,
        width: 800,
        height: 1000
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })

      Array.from(constructOpeningFrame(openingSegment, config, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledTimes(1)
    })

    it('calls the infill method with the wall below the sill', () => {
      mockInfillMethod.mockImplementationOnce((position, size) => {
        expect(position).toEqual(vec3.fromValues(0, 0, 0))
        expect(size).toEqual(vec3.fromValues(800, 360, 540))
        return createMockInfillGenerator(0)
      })

      const opening = createTestOpening({
        offsetFromStart: 0,
        sillHeight: 600,
        width: 800,
        height: 1900
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        headerThickness: 60,
        sillThickness: 60
      })

      Array.from(constructOpeningFrame(openingSegment, config, mockInfillMethod))

      expect(mockInfillMethod).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('returns error when header does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 2360,
        height: 100
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        headerThickness: 100
      })

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Header does not fit')
    })

    it('returns error when sill does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 50,
        height: 1200
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        sillThickness: 100
      })

      const results = [...constructOpeningFrame(openingSegment, config, mockInfillMethod)]
      const { errors } = aggregateResults(results)

      expect(errors).toHaveLength(1)
      expect(errors[0].description).toContain('Sill does not fit')
    })
  })
})
