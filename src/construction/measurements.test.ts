import { describe, expect, it } from 'vitest'

import { type Projection, createProjectionMatrix } from '@/construction/geometry'
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
import { type Vec2, ZERO_VEC2, newVec2, newVec3 } from '@/shared/geometry'

describe('measurements', () => {
  // Simple orthographic projection (XY plane - top view)
  const mockProjection: Projection = createProjectionMatrix('xy', 1, 1)

  const createMockTag = (id: string): Tag => ({
    id: `wall-measurement_${id}` as const,
    label: `${id} Label`,
    category: 'wall-measurement' as const
  })

  const createAutoMeasurement = (
    start = newVec3(0, 0, 0),
    end = newVec3(100, 0, 0),
    extend1 = newVec3(0, 50, 0),
    extend2 = newVec3(0, 0, 30),
    tags: Tag[] = []
  ): AutoMeasurement => ({
    startPoint: start,
    endPoint: end,
    extend1,
    extend2,
    tags
  })

  const createDirectMeasurement = (
    start = newVec3(0, 0, 0),
    end = newVec3(100, 0, 0),
    label = '100mm',
    offset = 0,
    tags: Tag[] = [],
    length?: number
  ): DirectMeasurement => ({
    startPoint: start,
    endPoint: end,
    length: length ?? 100,
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
      const measurement = createAutoMeasurement(newVec3(0, 0, 0), newVec3(0, 0, 0)) // Same start/end points
      const results = Array.from(processMeasurements([measurement], mockProjection, []))

      expect(results).toEqual([])
    })

    it('should process single horizontal measurement', () => {
      const measurement = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0))
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2) // left and right sides
      expect(results[0].direction).toEqual(newVec2(1, 0)) // horizontal direction
      expect(results[1].direction).toEqual(newVec2(1, 0))
    })

    it('should process single vertical measurement', () => {
      const measurement = createAutoMeasurement(newVec3(0, 0, 0), newVec3(0, 100, 0))
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2) // left and right sides
      expect(results[0].direction).toEqual(newVec2(0, 1)) // vertical direction
      expect(results[1].direction).toEqual(newVec2(0, 1))
    })

    it('should handle measurements with tags', () => {
      const tag = createMockTag('test-tag')
      const measurement = createAutoMeasurement(
        newVec3(0, 0, 0),
        newVec3(100, 0, 0),
        newVec3(0, 50, 0),
        newVec3(0, 0, 30),
        [tag]
      )
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      // Check if tags are preserved in the output
      const hasTaggedMeasurement = results.some(side =>
        side.lines.some(line => line.some(measurement => measurement.tags?.includes(tag)))
      )
      expect(hasTaggedMeasurement).toBe(true)
    })

    it('should handle measurements with no tags', () => {
      const measurement = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0), newVec3(100, 50, 30), undefined)
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)
      // Should handle undefined tags gracefully
      expect(results[0].lines.length + results[1].lines.length).toBeGreaterThan(0)
    })

    it('should normalize negative directions', () => {
      // Measurement going from right to left (negative direction)
      const measurement = createAutoMeasurement(newVec3(100, 0, 0), newVec3(0, 0, 0))
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

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
      const measurement = createAutoMeasurement(newVec3(0, 100, 0), newVec3(0, 0, 0))
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)
      // Direction should be normalized to positive
      expect(results[0].direction[0]).toBeCloseTo(0)
      expect(results[0].direction[1]).toBeCloseTo(1)
      expect(results[1].direction[0]).toBeCloseTo(0)
      expect(results[1].direction[1]).toBeCloseTo(1)
    })

    it('should group measurements with similar directions', () => {
      const measurement1 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0)) // horizontal
      const measurement2 = createAutoMeasurement(newVec3(0, 50, 0), newVec3(100, 50, 0)) // also horizontal
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(2) // Should be grouped together, so only 2 sides
      // Both should be horizontal
      expect(results[0].direction).toEqual(newVec2(1, 0))
      expect(results[1].direction).toEqual(newVec2(1, 0))
    })

    it('should create separate groups for different directions', () => {
      const measurement1 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0)) // horizontal
      const measurement2 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(0, 100, 0)) // vertical
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      expect(results).toHaveLength(4) // Two groups × 2 sides each = 4 total

      // Check that we have both horizontal and vertical directions
      const directions = results.map(r => r.direction)
      expect(directions).toContainEqual(newVec2(1, 0)) // horizontal
      expect(directions).toContainEqual(newVec2(0, 1)) // vertical
    })

    it('should assign measurements to appropriate sides based on distance', () => {
      // Create a measurement that should clearly go to one side
      const measurement = createAutoMeasurement(newVec3(50, 10, 0), newVec3(150, 10, 0)) // horizontal, closer to bottom
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)] // rectangle

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
      const measurement1 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(50, 0, 0)) // 0-50
      const measurement2 = createAutoMeasurement(newVec3(25, 0, 0), newVec3(75, 0, 0)) // 25-75 (overlaps)
      const measurement3 = createAutoMeasurement(newVec3(80, 0, 0), newVec3(130, 0, 0)) // 80-130 (no overlap)
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

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
      const measurement1 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(50, 0, 0)) // 0-50
      const measurement2 = createAutoMeasurement(newVec3(60, 0, 0), newVec3(110, 0, 0)) // 60-110 (no overlap)
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

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
      const measurement1 = createAutoMeasurement(
        newVec3(0, 0, 0),
        newVec3(100, 0, 0),
        newVec3(0, 50, 0),
        newVec3(0, 0, 30),
        [tag]
      )
      const measurement2 = createAutoMeasurement(
        newVec3(0, 0, 0),
        newVec3(100, 0, 0),
        newVec3(0, 50, 0),
        newVec3(0, 0, 30),
        [tag]
      )
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement1, measurement2], mockProjection, planPoints))

      // Should be deduplicated, so only one measurement in the result
      const totalMeasurements = results.reduce(
        (count, side) => count + side.lines.reduce((lineCount, line) => lineCount + line.length, 0),
        0
      )
      expect(totalMeasurements).toBe(1)
    })

    it('should deduplicate measurements with same start/end points but different sizes', () => {
      const measurement1 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0), newVec3(100, 20, 30)) // smaller perpendicular
      const measurement2 = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0), newVec3(100, 80, 30)) // larger perpendicular
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

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
      const measurement = createAutoMeasurement(newVec3(0, 0, 0), newVec3(100, 0, 0), newVec3(100, 50, 100)) // significant z component
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

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
      const measurement = createAutoMeasurement(newVec3(0, 0, 50), newVec3(100, 0, 150), newVec3(100, 50, 30)) // 3D measurement
      const planPoints: Vec2[] = [newVec2(0, 0), newVec2(200, 0), newVec2(200, 100), newVec2(0, 100)]

      const results = Array.from(processMeasurements([measurement], mockProjection, planPoints))

      expect(results).toHaveLength(2)

      // The z-components should be projected away, leaving horizontal direction
      expect(results[0].direction).toEqual(newVec2(1, 0))
      expect(results[1].direction).toEqual(newVec2(1, 0))
    })
  })

  describe('type unions and interfaces', () => {
    it('should properly distinguish between measurement types', () => {
      const auto = createAutoMeasurement()
      const direct = createDirectMeasurement()

      expect('extend1' in auto).toBe(true)
      if ('extend1' in auto) {
        expect(auto.extend1).toEqual(newVec3(0, 50, 0))
        expect(auto.extend2).toEqual(newVec3(0, 0, 30))
      }

      expect('label' in direct).toBe(true)
      if ('label' in direct) {
        expect(direct.label).toBe('100mm')
        expect(direct.offset).toBe(0)
      }
    })
  })

  describe('interface compatibility', () => {
    it('should create valid ProjectedMeasurement', () => {
      const projected: ProjectedMeasurement = {
        startPointMin: ZERO_VEC2,
        endPointMin: newVec2(100, 0),
        startPointMax: newVec2(0, 25),
        endPointMax: newVec2(100, 25),
        length: 100,
        tags: [createMockTag('test')]
      }

      expect(projected.startPointMin).toEqual(ZERO_VEC2)
    })

    it('should create valid IntervalMeasurement', () => {
      const interval: IntervalMeasurement = {
        startPointMin: ZERO_VEC2,
        endPointMin: newVec2(100, 0),
        startPointMax: newVec2(0, 25),
        endPointMax: newVec2(100, 25),
        length: 100,
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
        startPoint: ZERO_VEC2,
        endPoint: newVec2(100, 0),
        startOnLine: ZERO_VEC2,
        endOnLine: newVec2(100, 0),
        length: 100,
        tags: []
      }

      expect(line.startPoint).toEqual(ZERO_VEC2)
      expect(line.length).toBe(100)
    })

    it('should create valid MeasurementGroup', () => {
      const group: MeasurementGroup = {
        direction: newVec2(1, 0),
        startLeft: newVec2(-50, 0),
        startRight: newVec2(50, 0),
        measurements: []
      }

      expect(group.direction).toEqual(newVec2(1, 0))
      expect(group.measurements).toHaveLength(0)
    })

    it('should create valid MeasurementLines', () => {
      const lines: MeasurementLines = {
        direction: newVec2(1, 0),
        start: ZERO_VEC2,
        lines: []
      }

      expect(lines.direction).toEqual(newVec2(1, 0))
      expect(lines.lines).toHaveLength(0)
    })
  })
})
