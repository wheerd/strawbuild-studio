import { vec2 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import type { Roof } from '@/building/model'
import { millimeters } from '@/shared/geometry'

import { MonolithicRoofAssembly } from './monolithic'
import type { HeightItem, MonolithicRoofConfig } from './types'

describe('MonolithicRoofAssembly.getBottomOffsets', () => {
  const verticalOffset = 420

  const createTestRoof = (
    type: 'shed' | 'gable',
    ridgeStart: vec2,
    ridgeEnd: vec2,
    slope: number,
    verticalOffset = 3000
  ): Roof => ({
    id: 'test-roof' as any,
    storeyId: 'test-storey' as any,
    type,
    referencePolygon: {
      points: [vec2.fromValues(0, 0), vec2.fromValues(10000, 0), vec2.fromValues(10000, 5000), vec2.fromValues(0, 5000)]
    },
    overhangPolygon: {
      points: [
        vec2.fromValues(-500, -500),
        vec2.fromValues(10500, -500),
        vec2.fromValues(10500, 5500),
        vec2.fromValues(-500, 5500)
      ]
    },
    ridgeLine: { start: ridgeStart, end: ridgeEnd },
    mainSideIndex: 0,
    slope,
    verticalOffset: millimeters(verticalOffset),
    overhangs: [],
    assemblyId: 'test-assembly' as any
  })

  const createTestConfig = (insideThickness = 0): MonolithicRoofConfig => ({
    type: 'monolithic',
    thickness: millimeters(200),
    material: 'test-material' as any,
    infillMaterial: 'test-infill' as any,
    layers: {
      insideThickness: millimeters(insideThickness),
      insideLayers: [],
      topThickness: millimeters(0),
      topLayers: [],
      overhangThickness: millimeters(0),
      overhangLayers: []
    }
  })

  const assembly = new MonolithicRoofAssembly()

  describe('Shed Roof', () => {
    it('should calculate offsets for line perpendicular to ridge', () => {
      // Shed roof: ridge is on the top edge of reference polygon
      // Reference polygon: rectangle from Y=0 to Y=5000, ridge at Y=5000
      const roof = createTestRoof('shed', vec2.fromValues(0, 5000), vec2.fromValues(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Wall line perpendicular to ridge (runs north-south)
      const line = {
        start: vec2.fromValues(5000, 0), // At low edge (5000mm from ridge)
        end: vec2.fromValues(5000, 5000) // At ridge
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 2 offset points for shed roof
      expect(offsets).toHaveLength(2)

      // First point at t=0
      expect(offsets[0].position).toBeCloseTo(0, 5)

      // Last point at t=1
      expect(offsets[1].position).toBeCloseTo(1, 5)

      const tan30 = Math.tan((30 * Math.PI) / 180)
      const expectedHeight = 5000 * tan30

      // Start (Y=0) is 5000mm from ridge, end (Y=5000) is on ridge
      // End (on ridge) should have highest offset
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(verticalOffset)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedHeight)
    })

    it('should calculate offsets for line parallel to ridge', () => {
      // Ridge at Y=5000 (top edge of reference polygon)
      const roof = createTestRoof('shed', vec2.fromValues(0, 5000), vec2.fromValues(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Wall line parallel to ridge, 1000mm below it
      const line = {
        start: vec2.fromValues(0, 4000),
        end: vec2.fromValues(10000, 4000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 2 offset points
      expect(offsets).toHaveLength(2)
      expect(offsets[0].position).toBeCloseTo(0, 5)
      expect(offsets[1].position).toBeCloseTo(1, 5)

      const tan30 = Math.tan((30 * Math.PI) / 180)
      const expectedHeight = 4000 * tan30

      // Both points are same distance from ridge, so same offset
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedHeight)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedHeight)
    })

    it('should handle line on the ridge itself', () => {
      // Ridge at Y=5000 (top edge)
      const roof = createTestRoof('shed', vec2.fromValues(0, 5000), vec2.fromValues(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Wall line exactly on the ridge
      const line = {
        start: vec2.fromValues(100, 5000),
        end: vec2.fromValues(1000, 5000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 2 offset points
      expect(offsets).toHaveLength(2)

      const tan30 = Math.tan((30 * Math.PI) / 180)
      const expectedHeight = 5000 * tan30

      // Both points are same distance from ridge, so same offset
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedHeight)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedHeight)
    })

    it('should handle overhang beyond reference polygon', () => {
      // Ridge at Y=5000 (top edge)
      const roof = createTestRoof('shed', vec2.fromValues(0, 5000), vec2.fromValues(10000, 5000), 30, verticalOffset)
      const config = createTestConfig(0)

      // Line extends beyond reference polygon into overhang area
      const line = {
        start: vec2.fromValues(5000, -500), // In overhang below building
        end: vec2.fromValues(5000, 5500) // In overhang above ridge
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should calculate valid offsets for entire line (it's within overhang)
      // May have multiple points if line crosses polygon boundaries
      expect(offsets.length).toBeGreaterThanOrEqual(2)
      expect(offsets[0].position).toBeCloseTo(0, 5)
      expect(offsets[offsets.length - 1].position).toBeCloseTo(1, 5)

      const tan30 = Math.tan((30 * Math.PI) / 180)
      const expectedBottom = 500 * tan30
      const expectedTop = 5500 * tan30

      // Check first and last offsets
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(verticalOffset - expectedBottom, 0)
      expect((offsets[offsets.length - 1] as HeightItem).offset).toBeCloseTo(verticalOffset + expectedTop, 0)
    })

    it('should handle diagonal line at 45 degrees', () => {
      // Ridge at Y=5000 (top edge)
      const roof = createTestRoof('shed', vec2.fromValues(0, 5000), vec2.fromValues(10000, 5000), 30)
      const config = createTestConfig(0)

      // Diagonal line from low side toward ridge
      const line = {
        start: vec2.fromValues(3000, 1000), // Below ridge
        end: vec2.fromValues(7000, 4000) // Closer to ridge
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 2 offset points for shed roof
      expect(offsets).toHaveLength(2)

      // End should be higher (closer to ridge)
      expect((offsets[1] as HeightItem).offset).toBeGreaterThan((offsets[0] as HeightItem).offset)
    })
  })

  describe('Gable Roof', () => {
    it('should calculate offsets for line perpendicular to ridge (crossing ridge)', () => {
      // Ridge runs along X-axis at Y=2500 (middle of reference polygon)
      const roof = createTestRoof('gable', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Wall line perpendicular to ridge, crossing it
      const line = {
        start: vec2.fromValues(5000, 0),
        end: vec2.fromValues(5000, 5000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 3 offset points: start, ridge intersection, end
      expect(offsets).toHaveLength(3)

      // First point at t=0
      expect(offsets[0].position).toBeCloseTo(0, 5)

      // Middle point at t=0.5 (ridge is at Y=2500, line goes from 0 to 5000)
      expect(offsets[1].position).toBeCloseTo(0.5, 3)

      // Last point at t=1
      expect(offsets[2].position).toBeCloseTo(1, 5)

      // Calculate expected values:
      // For gable: reference polygon is 10000x5000, ridge at Y=2500
      // Max distance from ridge = 2500mm
      // ridgeHeight = verticalOffset + maxDistance * tan(30°)
      const tan30 = Math.tan((30 * Math.PI) / 180)
      const ridgeHeight = 3000 + 2500 * tan30

      // For gable roof: offset = ridgeHeight - abs(signedDistance) * tan(slope)
      // Start: distance from ridge = 2500mm, offset = ridgeHeight - 2500 * tan(30°)
      // End: distance from ridge = 2500mm, offset = ridgeHeight - 2500 * tan(30°)
      const expectedEdgeOffset = ridgeHeight - 2500 * tan30

      expect((offsets[0] as HeightItem).offset).toBeCloseTo(expectedEdgeOffset, 1)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(ridgeHeight, 1)
      expect((offsets[2] as HeightItem).offset).toBeCloseTo(expectedEdgeOffset, 1)

      // Start and end should be symmetric (same distance from ridge)
      expect((offsets[0] as HeightItem).offset).toBeCloseTo((offsets[2] as HeightItem).offset, 1)
    })

    it('should calculate offsets for line parallel to ridge', () => {
      // Ridge runs along X-axis
      const roof = createTestRoof('gable', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Wall line parallel to ridge, 1000mm away
      const line = {
        start: vec2.fromValues(0, 1500),
        end: vec2.fromValues(10000, 1500)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 2 offset points (doesn't cross ridge)
      expect(offsets).toHaveLength(2)

      // Calculate expected offset
      const tan30 = Math.tan((30 * Math.PI) / 180)
      const ridgeHeight = 3000 + 2500 * tan30
      const distanceFromRidge = 1000
      const expectedOffset = ridgeHeight - distanceFromRidge * tan30

      // Both points same distance from ridge, so same offset
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(expectedOffset, 1)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(expectedOffset, 1)
    })

    it('should handle line on the ridge itself', () => {
      // Ridge runs along X-axis
      const roof = createTestRoof('gable', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Wall line exactly on ridge
      const line = {
        start: vec2.fromValues(0, 2500),
        end: vec2.fromValues(10000, 2500)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // When line is on ridge, no intersection is found (parallel lines)
      // Should return 2 points with maximum offset
      expect(offsets).toHaveLength(2)

      // Calculate expected ridge height
      const tan30 = Math.tan((30 * Math.PI) / 180)
      const ridgeHeight = 3000 + 2500 * tan30

      // Both at ridge height (distance from ridge = 0)
      expect((offsets[0] as HeightItem).offset).toBeCloseTo(ridgeHeight, 1)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(ridgeHeight, 1)
    })

    it('should handle diagonal line crossing ridge at angle', () => {
      // Ridge runs along X-axis at Y=2500
      const roof = createTestRoof('gable', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Diagonal line crossing ridge
      const line = {
        start: vec2.fromValues(2000, 1000), // 1500mm below ridge
        end: vec2.fromValues(8000, 4000) // 1500mm above ridge
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Should have 3 points (crosses ridge)
      expect(offsets).toHaveLength(3)

      // Calculate expected values
      const tan30 = Math.tan((30 * Math.PI) / 180)
      const ridgeHeight = 3000 + 2500 * tan30

      // Both start and end are 1500mm from ridge
      const distanceFromRidge = 1500
      const expectedEdgeOffset = ridgeHeight - distanceFromRidge * tan30

      // Middle point should be at ridge (t should be 0.5 for symmetric line)
      expect(offsets[1].position).toBeCloseTo(0.5, 2)

      expect((offsets[0] as HeightItem).offset).toBeCloseTo(expectedEdgeOffset, 1)
      expect((offsets[1] as HeightItem).offset).toBeCloseTo(ridgeHeight, 1)
      expect((offsets[2] as HeightItem).offset).toBeCloseTo(expectedEdgeOffset, 1)
    })

    it('should handle line that does not intersect overhang', () => {
      // Ridge runs from (0, 2500) to (10000, 2500)
      const roof = createTestRoof('gable', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Line that is completely outside the overhang polygon
      const line = {
        start: vec2.fromValues(11000, 1000),
        end: vec2.fromValues(12000, 4000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      // Line is completely outside overhang, should return empty array
      expect(offsets).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero slope roof', () => {
      const roof = createTestRoof('shed', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 0.1) // Nearly flat
      const config = createTestConfig(0)

      const line = {
        start: vec2.fromValues(5000, 0),
        end: vec2.fromValues(5000, 5000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      expect(offsets).toHaveLength(2)
      // With near-zero slope, offsets should be very similar
      expect(Math.abs((offsets[0] as HeightItem).offset - (offsets[1] as HeightItem).offset)).toBeLessThan(100) // Less than 100mm difference
    })

    it('should handle steep slope roof', () => {
      const roof = createTestRoof('shed', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 60) // Steep
      const config = createTestConfig(0)

      const line = {
        start: vec2.fromValues(5000, 0),
        end: vec2.fromValues(5000, 5000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      expect(offsets).toHaveLength(2)
      // With steep slope, offset difference should be large
      expect(Math.abs((offsets[0] as HeightItem).offset - (offsets[1] as HeightItem).offset)).toBeGreaterThan(4000) // More than 4000mm
    })

    it('should handle very short line segments', () => {
      const roof = createTestRoof('shed', vec2.fromValues(0, 2500), vec2.fromValues(10000, 2500), 30)
      const config = createTestConfig(0)

      // Very short line (10mm)
      const line = {
        start: vec2.fromValues(5000, 2500),
        end: vec2.fromValues(5010, 2500)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      expect(offsets).toHaveLength(2)
      // Offsets should be nearly identical for such a short line
      expect(Math.abs((offsets[0] as HeightItem).offset - (offsets[1] as HeightItem).offset)).toBeLessThan(1)
    })

    it('should handle ridge at different orientations', () => {
      // Ridge runs along Y-axis (vertical)
      const roof = createTestRoof('shed', vec2.fromValues(5000, 0), vec2.fromValues(5000, 10000), 30)
      const config = createTestConfig(0)

      // Wall perpendicular to vertical ridge
      const line = {
        start: vec2.fromValues(0, 5000),
        end: vec2.fromValues(10000, 5000)
      }

      const offsets = assembly.getBottomOffsets(roof, config, line)

      expect(offsets).toHaveLength(2)
      expect((offsets[0] as HeightItem).offset).not.toBeCloseTo((offsets[1] as HeightItem).offset, 1)
    })
  })
})
