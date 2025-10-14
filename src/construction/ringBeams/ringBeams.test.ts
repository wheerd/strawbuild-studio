import { describe, expect, it, vi } from 'vitest'

import type { PerimeterId } from '@/building/model/ids'
import type { Perimeter, PerimeterCorner } from '@/building/model/model'
import { type ConstructionElement, type ConstructionElementId } from '@/construction/elements'
import * as base from '@/construction/elements'
import type { MaterialId } from '@/construction/materials/material'
import type { CutCuboid } from '@/construction/shapes'
import { createLength, createVec2, polygonIsClockwise } from '@/shared/geometry'

import { type FullRingBeamConfig, constructFullRingBeam, constructRingBeam } from './ringBeams'

vi.mock('@/construction/elements', async () => {
  const original = await vi.importActual('@/construction/elements')
  return { ...original, createConstructionElement: vi.fn() }
})

vi.mocked(base.createConstructionElement).mockImplementation((material, shape, transform) => ({
  id: 'test-element' as ConstructionElementId,
  material,
  shape,
  transform: transform || { position: [0, 0, 0], rotation: [0, 0, 0] },
  bounds: shape.bounds
}))

// Mock data helpers
function createMockCorner(
  id: string,
  insidePoint: [number, number],
  constructedByWall: 'previous' | 'next'
): PerimeterCorner {
  return {
    id: id as any,
    insidePoint: createVec2(insidePoint[0], insidePoint[1]),
    outsidePoint: createVec2(0, 0), // Not used in ring beam construction
    constructedByWall,
    interiorAngle: 90, // Default angle for testing
    exteriorAngle: 270 // Default angle for testing
  }
}

function createMockPerimeter(corners: PerimeterCorner[]): Perimeter {
  return {
    id: 'test-perimeter' as PerimeterId,
    storeyId: 'test-storey' as any,
    walls: [], // Not used in ring beam construction
    corners
  }
}

const mockMaterial: MaterialId = 'test-material' as MaterialId

const defaultConfig: FullRingBeamConfig = {
  type: 'full',
  height: createLength(60),
  width: createLength(360),
  offsetFromEdge: createLength(100),
  material: mockMaterial
}

describe('constructFullRingBeam', () => {
  describe('Basic Functionality', () => {
    it('should construct ring beam for simple rectangle', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 3000], 'next'),
        createMockCorner('c3', [4000, 3000], 'next'),
        createMockCorner('c2', [4000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructRingBeam(perimeter, defaultConfig)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      result.elements.forEach(element => {
        expect('material' in element).toBe(true)
        const constructionElement = element as ConstructionElement
        expect(constructionElement.material).toBe(mockMaterial)
        expect(constructionElement.shape.type).toBe('cut-cuboid')
      })
    })

    it('should create elements with correct dimensions', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [2000, 1000], 'next'),
        createMockCorner('c2', [2000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      result.elements.forEach(element => {
        expect('material' in element).toBe(true)
        const constructionElement = element as ConstructionElement
        expect(constructionElement.shape.type).toBe('cut-cuboid')
        expect((constructionElement.shape as CutCuboid).size[0]).toBeGreaterThan(0) // Length > 0
        expect((constructionElement.shape as CutCuboid).size[1]).toBe(defaultConfig.width) // Width
        expect((constructionElement.shape as CutCuboid).size[2]).toBe(defaultConfig.height) // Height
      })
    })

    it('should handle different constructedByWall settings', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'previous'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [1000, 1000], 'next'),
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Configuration Variations', () => {
    it('should handle different offset values', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [1000, 1000], 'next'),
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)

      const configs = [
        { ...defaultConfig, offsetFromEdge: createLength(0) },
        { ...defaultConfig, offsetFromEdge: createLength(50) },
        { ...defaultConfig, offsetFromEdge: createLength(200) },
        { ...defaultConfig, offsetFromEdge: createLength(-50) }
      ]

      configs.forEach(config => {
        const result = constructFullRingBeam(perimeter, config)
        expect(result.elements.length).toBeGreaterThan(0)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should handle different beam dimensions', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [1000, 1000], 'next'),
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)

      const customConfig: FullRingBeamConfig = {
        ...defaultConfig,
        width: createLength(240),
        height: createLength(90)
      }

      const result = constructFullRingBeam(perimeter, customConfig)

      result.elements.forEach(element => {
        expect('material' in element).toBe(true)
        const constructionElement = element as ConstructionElement
        expect(constructionElement.shape.type).toBe('cut-cuboid')
        expect((constructionElement.shape as CutCuboid).size[1]).toBe(240) // Custom width
        expect((constructionElement.shape as CutCuboid).size[2]).toBe(90) // Custom height
      })
    })
  })

  describe('Position and Rotation', () => {
    it('should create elements with valid positions and rotations', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [1000, 1000], 'next'),
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      result.elements.forEach(element => {
        expect('material' in element).toBe(true)
        const constructionElement = element as ConstructionElement

        // Position should be valid 3D coordinates
        expect(constructionElement.transform.position).toHaveLength(3)
        expect(Number.isFinite(constructionElement.transform.position[0])).toBe(true)
        expect(Number.isFinite(constructionElement.transform.position[1])).toBe(true)
        expect(constructionElement.transform.position[2]).toBe(0) // Z should be 0

        // Rotation should be valid
        expect(constructionElement.transform.rotation).toHaveLength(3)
        expect(Number.isFinite(constructionElement.transform.rotation[2])).toBe(true)
        expect(constructionElement.transform.rotation[0]).toBe(0) // X rotation should be 0
        expect(constructionElement.transform.rotation[1]).toBe(0) // Y rotation should be 0
      })
    })
  })

  describe('Angle Scenarios - Snapshots', () => {
    it('should handle 90° corners (rectangle)', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c2', [0, 10000], 'previous'),
        createMockCorner('c3', [10000, 10000], 'next'),
        createMockCorner('c4', [10000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    it('should handle 135° corners', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c4', [0, 1000], 'next'),
        createMockCorner('c3', [500, 500], 'next'), // Creates 135° angle
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    it('should handle 60° corners (triangle)', () => {
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c3', [500, 866], 'previous'), // Equilateral triangle (60° corners)
        createMockCorner('c2', [1000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    it('should handle 180° corners (straight line - should be simplified)', () => {
      // This tests the polygon simplification - 180° corners should be removed
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c5', [0, 1000], 'next'),
        createMockCorner('c4', [1000, 1000], 'next'),
        createMockCorner('c3', [1000, 0], 'next'),
        createMockCorner('c2', [500, 0], 'next') // This should be simplified away
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    test.each([
      { angle: -150, cut: -60 },
      { angle: -135, cut: -45 },
      { angle: -120, cut: -30 },
      { angle: -90, cut: 0 },
      { angle: -60, cut: 30 },
      { angle: -45, cut: 45 },
      { angle: -30, cut: 60 },
      { angle: 30, cut: -60 },
      { angle: 45, cut: -45 },
      { angle: 60, cut: -30 },
      { angle: 90, cut: 0 },
      { angle: 120, cut: 30 },
      { angle: 135, cut: 45 },
      { angle: 150, cut: 60 }
    ])('Cut angle test %s', ({ angle, cut }) => {
      const sign = Math.abs(angle) > 90 ? -1000 : 1000
      const x = Math.abs(Math.abs(angle) - 90) < 0.1 ? 0 : sign
      const y =
        Math.abs(Math.abs(angle) - 90) < 0.1 ? Math.sign(angle) * 1000 : sign * Math.tan((angle / 180) * Math.PI)

      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c2', [x, y], 'next'),
        createMockCorner('c3', [-1000, 0], 'next')
      ]

      if (angle > 0) {
        corners.splice(
          2,
          0,
          createMockCorner('c4', [-10000, 10000], 'next'),
          createMockCorner('c5', [-1000, 10000], 'next')
        )
      }

      const points = corners.map(c => c.insidePoint)
      expect(polygonIsClockwise({ points })).toBeTruthy()

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const firstElement = result.elements.find(element => 'material' in element) as ConstructionElement
      const lastElement = result.elements[result.elements.length - 1] as ConstructionElement
      const startCut = (firstElement.shape as CutCuboid).startCut?.angle
      const endCut = (lastElement.shape as CutCuboid).endCut?.angle

      expect(startCut).toBeCloseTo(cut)
      expect(endCut).toBeCloseTo(cut === 0 ? cut : -cut)
    })

    it('should handle 270° corners (L-shape concave)', () => {
      // L-shaped building with concave (270°) inner corner
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c6', [0, 2000], 'next'),
        createMockCorner('c5', [1000, 2000], 'next'),
        createMockCorner('c4', [1000, 1000], 'next'), // 270° concave corner
        createMockCorner('c3', [2000, 1000], 'next'),
        createMockCorner('c2', [2000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    it('should handle 30° corners (very acute angle)', () => {
      // Create a shape with very acute 30° corners (like a narrow triangle)
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c3', [1000, 577], 'next'), // Creates ~30° corners (tan(30°) ≈ 0.577)
        createMockCorner('c2', [2000, 0], 'next')
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })

    it('should handle 45° corners', () => {
      // Create a shape with 45° corners (like an octagon segment)
      const corners = [
        createMockCorner('c1', [0, 0], 'next'),
        createMockCorner('c5', [0, 1000], 'next'),
        createMockCorner('c4', [1000, 1000], 'next'),
        createMockCorner('c3', [2414, 1000], 'next'), // Creates 45° corner
        createMockCorner('c2', [1414, 0], 'next') // ~sqrt(2) * 1000 for 45° geometry
      ]

      const perimeter = createMockPerimeter(corners)
      const result = constructFullRingBeam(perimeter, defaultConfig)

      const cutsAndLengths = result.elements.map(element => {
        const constructionElement = element as ConstructionElement
        const shape = constructionElement.shape as CutCuboid
        return { startCut: shape.startCut?.angle, endCut: shape.endCut?.angle, length: shape.size[0] }
      })

      expect(cutsAndLengths).toMatchSnapshot()
    })
  })
})
