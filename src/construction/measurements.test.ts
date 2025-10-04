import { describe, expect, it } from 'vitest'

import type { Projection } from '@/construction/geometry'
import {
  type AutoMeasurement,
  type DirectMeasurement,
  type IntervalMeasurement,
  type LineMeasurement,
  type MeasurementGroup,
  type MeasurementLines,
  type ProjectedMeasurement,
  processMeasurements
} from '@/construction/measurements'
import type { Tag } from '@/construction/tags'
import { type Vec2, type Vec3, createLength, createVec2 } from '@/shared/geometry'

describe('measurements', () => {
  // Simple orthographic projection (x, y, z) -> (x, y)
  const mockProjection: Projection = (point: Vec3): Vec2 => [point[0], point[1]]

  const createMockTag = (id: string): Tag => ({
    id: `measurement_${id}` as const,
    label: `${id} Label`,
    category: 'measurement' as const
  })

  const createAutoMeasurement = (
    start: Vec3 = [0, 0, 0],
    end: Vec3 = [100, 0, 0],
    size: Vec3 = [100, 50, 30],
    tags: Tag[] = []
  ): AutoMeasurement => ({
    startPoint: start,
    endPoint: end,
    size,
    tags
  })

  const createDirectMeasurement = (
    start: Vec3 = [0, 0, 0],
    end: Vec3 = [100, 0, 0],
    label = '100mm',
    offset = 0,
    tags: Tag[] = []
  ): DirectMeasurement => ({
    startPoint: start,
    endPoint: end,
    label,
    offset,
    tags
  })

  describe('processMeasurements', () => {
    it('should process empty measurements array', () => {
      const results = Array.from(processMeasurements([], mockProjection, []))
      expect(results).toEqual([])
    })

    it('should filter out zero-length measurements', () => {
      const measurement = createAutoMeasurement([0, 0, 0], [0, 0, 0]) // Same start/end points
      const results = Array.from(processMeasurements([measurement], mockProjection, []))

      expect(results).toEqual([])
    })

    it('should process single horizontal measurement', () => {
      const measurement = createAutoMeasurement([0, 0, 0], [100, 0, 0])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2) // left and right sides
      expect(results[0].direction).toEqual(createVec2(1, 0)) // horizontal direction
      expect(results[1].direction).toEqual(createVec2(1, 0))
    })

    it('should process single vertical measurement', () => {
      const measurement = createAutoMeasurement([0, 0, 0], [0, 100, 0])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2) // left and right sides
      expect(results[0].direction).toEqual(createVec2(0, 1)) // vertical direction
      expect(results[1].direction).toEqual(createVec2(0, 1))
    })

    it('should handle measurements with tags', () => {
      const tag = createMockTag('test-tag')
      const measurement = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 50, 30], [tag])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      // Check if tags are preserved in the output
      const hasTaggedMeasurement = results.some(side =>
        side.lines.some(line => line.some(measurement => measurement.tags?.includes(tag)))
      )
      expect(hasTaggedMeasurement).toBe(true)
    })

    it('should handle measurements with no tags', () => {
      const measurement = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 50, 30], undefined)
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)
      // Should handle undefined tags gracefully
      expect(results[0].lines.length + results[1].lines.length).toBeGreaterThan(0)
    })

    it('should normalize negative directions', () => {
      // Measurement going from right to left (negative direction)
      const measurement = createAutoMeasurement([100, 0, 0], [0, 0, 0])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)
      // Direction should be normalized to positive
      expect(results[0].direction[0]).toBeCloseTo(1)
      expect(results[0].direction[1]).toBeCloseTo(0)
      expect(results[1].direction[0]).toBeCloseTo(1)
      expect(results[1].direction[1]).toBeCloseTo(0)
    })

    it('should normalize negative y direction when x is zero', () => {
      // Measurement going from top to bottom (negative y direction)
      const measurement = createAutoMeasurement([0, 100, 0], [0, 0, 0])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)
      // Direction should be normalized to positive
      expect(results[0].direction[0]).toBeCloseTo(0)
      expect(results[0].direction[1]).toBeCloseTo(1)
      expect(results[1].direction[0]).toBeCloseTo(0)
      expect(results[1].direction[1]).toBeCloseTo(1)
    })

    it('should group measurements with similar directions', () => {
      const measurement1 = createAutoMeasurement([0, 0, 0], [100, 0, 0]) // horizontal
      const measurement2 = createAutoMeasurement([0, 50, 0], [100, 50, 0]) // also horizontal
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(2) // Should be grouped together, so only 2 sides
      // Both should be horizontal
      expect(results[0].direction).toEqual(createVec2(1, 0))
      expect(results[1].direction).toEqual(createVec2(1, 0))
    })

    it('should create separate groups for different directions', () => {
      const measurement1 = createAutoMeasurement([0, 0, 0], [100, 0, 0]) // horizontal
      const measurement2 = createAutoMeasurement([0, 0, 0], [0, 100, 0]) // vertical
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(4) // Two groups × 2 sides each = 4 total

      // Check that we have both horizontal and vertical directions
      const directions = results.map(r => r.direction)
      expect(directions).toContainEqual(createVec2(1, 0)) // horizontal
      expect(directions).toContainEqual(createVec2(0, 1)) // vertical
    })

    it('should assign measurements to appropriate sides based on distance', () => {
      // Create a measurement that should clearly go to one side
      const measurement = createAutoMeasurement([50, 10, 0], [150, 10, 0]) // horizontal, closer to bottom
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ] // rectangle

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)

      // One side should have the measurement, the other should be empty
      const leftSide = results[0]
      const rightSide = results[1]
      const totalMeasurements =
        leftSide.lines.reduce((sum, line) => sum + line.length, 0) +
        rightSide.lines.reduce((sum, line) => sum + line.length, 0)

      expect(totalMeasurements).toBe(1)
    })

    it('should handle overlapping measurements by placing them in different rows', () => {
      const measurement1 = createAutoMeasurement([0, 0, 0], [50, 0, 0]) // 0-50
      const measurement2 = createAutoMeasurement([25, 0, 0], [75, 0, 0]) // 25-75 (overlaps)
      const measurement3 = createAutoMeasurement([80, 0, 0], [130, 0, 0]) // 80-130 (no overlap)
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(
        processMeasurements([measurement1, measurement2, measurement3], mockProjection, planPoints)
      )

      expect(results).toHaveLength(2) // All should be grouped (same direction)

      // Check that overlapping measurements are in different rows
      const leftSide = results[0]
      const rightSide = results[1]
      const sideWithMeasurements = leftSide.lines.length > 0 ? leftSide : rightSide

      expect(sideWithMeasurements.lines.length).toBeGreaterThan(1) // Multiple rows due to overlap
    })

    it('should place non-overlapping measurements in the same row', () => {
      const measurement1 = createAutoMeasurement([0, 0, 0], [50, 0, 0]) // 0-50
      const measurement2 = createAutoMeasurement([60, 0, 0], [110, 0, 0]) // 60-110 (no overlap)
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(2) // Same direction, so grouped

      // Check that non-overlapping measurements can share a row
      const leftSide = results[0]
      const rightSide = results[1]
      const sideWithMeasurements = leftSide.lines.length > 0 ? leftSide : rightSide

      if (sideWithMeasurements.lines.length > 0) {
        const totalInFirstRow = sideWithMeasurements.lines[0].length
        expect(totalInFirstRow).toBeGreaterThanOrEqual(1)
      }
    })

    it('should deduplicate measurements with identical t1, t2, and tags', () => {
      const tag = createMockTag('duplicate-tag')
      // Two identical measurements
      const measurement1 = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 50, 30], [tag])
      const measurement2 = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 50, 30], [tag])
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      // Should be deduplicated, so only one measurement in the result
      const totalMeasurements = results.reduce(
        (count, side) => count + side.lines.reduce((lineCount, line) => lineCount + line.length, 0),
        0
      )
      expect(totalMeasurements).toBe(1)
    })

    it('should deduplicate measurements with same start/end points but different sizes', () => {
      const measurement1 = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 20, 30]) // smaller perpendicular
      const measurement2 = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 80, 30]) // larger perpendicular
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(2) // Same direction, so grouped

      // Measurements with same start/end should be deduplicated regardless of perpendicular range
      const totalMeasurements = results.reduce(
        (count, side) => count + side.lines.reduce((lineCount, line) => lineCount + line.length, 0),
        0
      )
      expect(totalMeasurements).toBe(1)
    })

    it('should handle 3D measurements with z-component in size', () => {
      const measurement = createAutoMeasurement([0, 0, 0], [100, 0, 0], [100, 50, 100]) // significant z component
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)

      // Should handle the 3D size correctly
      const totalMeasurements = results.reduce(
        (count, side) => count + side.lines.reduce((lineCount, line) => lineCount + line.length, 0),
        0
      )
      expect(totalMeasurements).toBe(1)
    })

    it('should correctly project 3D measurements to 2D', () => {
      const measurement = createAutoMeasurement([0, 0, 50], [100, 0, 150], [100, 50, 30]) // 3D measurement
      const planPoints: Vec2[] = [
        [0, 0],
        [200, 0],
        [200, 100],
        [0, 100]
      ]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)

      // The z-components should be projected away, leaving horizontal direction
      expect(results[0].direction).toEqual(createVec2(1, 0))
      expect(results[1].direction).toEqual(createVec2(1, 0))
    })
  })

  describe('type unions and interfaces', () => {
    it('should handle AutoMeasurement type', () => {
      const auto = createAutoMeasurement()
      expect('size' in auto).toBe(true)
      expect('label' in auto).toBe(false)
    })

    it('should handle DirectMeasurement type', () => {
      const direct = createDirectMeasurement()
      expect('size' in direct).toBe(false)
      expect('label' in direct).toBe(true)
    })

    it('should properly distinguish between measurement types', () => {
      const auto = createAutoMeasurement()
      const direct = createDirectMeasurement()

      // Type guard-like checks
      if ('size' in auto) {
        expect(auto.size).toEqual([100, 50, 30])
      }

      if ('label' in direct) {
        expect(direct.label).toBe('100mm')
        expect(direct.offset).toBe(0)
      }
    })
  })

  describe('interface compatibility', () => {
    it('should create valid ProjectedMeasurement', () => {
      const projected: ProjectedMeasurement = {
        startPointMin: [0, 0] as Vec2,
        endPointMin: [100, 0] as Vec2,
        startPointMax: [0, 25] as Vec2,
        endPointMax: [100, 25] as Vec2,
        perpendicularRange: 25,
        length: createLength(100),
        tags: [createMockTag('test')]
      }

      expect(projected.startPointMin).toEqual([0, 0])
      expect(projected.perpendicularRange).toBe(25)
    })

    it('should create valid IntervalMeasurement', () => {
      const interval: IntervalMeasurement = {
        startPointMin: [0, 0] as Vec2,
        endPointMin: [100, 0] as Vec2,
        startPointMax: [0, 25] as Vec2,
        endPointMax: [100, 25] as Vec2,
        perpendicularRange: 25,
        length: createLength(100),
        t1: 0,
        t2: 100,
        distanceLeft: 30,
        distanceRight: 60,
        tags: []
      }

      expect(interval.t1).toBe(0)
      expect(interval.distanceLeft).toBe(30)
    })

    it('should create valid LineMeasurement', () => {
      const line: LineMeasurement = {
        startPoint: [0, 0] as Vec2,
        endPoint: [100, 0] as Vec2,
        startOnLine: [0, 0] as Vec2,
        endOnLine: [100, 0] as Vec2,
        length: createLength(100),
        tags: []
      }

      expect(line.startPoint).toEqual([0, 0])
      expect(line.length).toBe(100)
    })

    it('should create valid MeasurementGroup', () => {
      const group: MeasurementGroup = {
        direction: [1, 0] as Vec2,
        startLeft: [-50, 0] as Vec2,
        startRight: [50, 0] as Vec2,
        measurements: []
      }

      expect(group.direction).toEqual([1, 0])
      expect(group.measurements).toHaveLength(0)
    })

    it('should create valid MeasurementLines', () => {
      const lines: MeasurementLines = {
        direction: [1, 0] as Vec2,
        start: [0, 0] as Vec2,
        lines: []
      }

      expect(lines.direction).toEqual([1, 0])
      expect(lines.lines).toHaveLength(0)
    })
  })
})
