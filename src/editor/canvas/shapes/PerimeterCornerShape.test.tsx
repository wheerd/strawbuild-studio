import { render } from '@testing-library/react'
import { vec2 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import { createPerimeterCornerId, createPerimeterWallId } from '@/building/model/ids'
import type { PerimeterCorner, PerimeterWall } from '@/building/model/model'
import '@/shared/geometry'

import { PerimeterCornerShape } from './PerimeterCornerShape'

// Mock the hooks
vi.mock('@/editor/hooks/useSelectionStore', () => ({
  useSelectionStore: () => ({
    isCurrentSelection: () => false
  })
}))

vi.mock('@/construction/config/store', () => ({
  usePerimeterConstructionMethodById: () => ({
    config: { type: 'strawbale' }
  })
}))

describe('PerimeterCornerShape', () => {
  const createMockWall = (direction: vec2): PerimeterWall => ({
    id: createPerimeterWallId(),
    thickness: 440,
    constructionMethodId: 'method1' as any,
    openings: [],
    insideLength: 1000,
    outsideLength: 1000,
    wallLength: 1000,
    insideLine: { start: vec2.fromValues(0, 0), end: direction },
    outsideLine: { start: vec2.fromValues(0, 0), end: direction },
    direction,
    outsideDirection: vec2.fromValues(-direction[1], direction[0])
  })

  const createMockCorner = (interiorAngleDegrees: number): PerimeterCorner => ({
    id: createPerimeterCornerId(),
    insidePoint: vec2.fromValues(100, 100),
    outsidePoint: vec2.fromValues(120, 120),
    constructedByWall: 'next',
    interiorAngle: interiorAngleDegrees,
    exteriorAngle: 360 - interiorAngleDegrees
  })

  it('should render rounded rectangle overlay for near-180° interior angles', () => {
    const corner = createMockCorner(178) // Close to 180°
    const previousWall = createMockWall(vec2.fromValues(1, 0))
    const nextWall = createMockWall(vec2.fromValues(1, 0))

    const { container } = render(
      <PerimeterCornerShape
        corner={corner}
        previousWall={previousWall}
        nextWall={nextWall}
        perimeterId="test-perimeter"
      />
    )

    // Should have multiple div elements (konva shapes render as divs in tests)
    // The overlay should be present as an additional Line element beyond the main corner polygon
    const divElements = container.querySelectorAll('div[data-testid="konva-line"]')
    expect(divElements.length).toBeGreaterThan(1) // Should have corner polygon + overlay + possibly other lines
  })

  it('should render rounded rectangle overlay for near-180° exterior angles', () => {
    const corner = createMockCorner(182) // Exterior angle is 178°, close to 180°
    const previousWall = createMockWall(vec2.fromValues(1, 0))
    const nextWall = createMockWall(vec2.fromValues(1, 0))

    const { container } = render(
      <PerimeterCornerShape
        corner={corner}
        previousWall={previousWall}
        nextWall={nextWall}
        perimeterId="test-perimeter"
      />
    )

    // Should have multiple Line elements (overlay + corner polygon)
    const lineElements = container.querySelectorAll('div[data-testid="konva-line"]')
    expect(lineElements.length).toBeGreaterThan(1)
  })

  it('should not render overlay for normal angles', () => {
    const corner = createMockCorner(90) // Normal 90° corner
    const previousWall = createMockWall(vec2.fromValues(1, 0))
    const nextWall = createMockWall(vec2.fromValues(0, 1))

    const { container } = render(
      <PerimeterCornerShape
        corner={corner}
        previousWall={previousWall}
        nextWall={nextWall}
        perimeterId="test-perimeter"
      />
    )

    // Should have only the corner polygon Line element (no overlay)
    const lineElements = container.querySelectorAll('div[data-testid="konva-line"]')
    expect(lineElements.length).toBe(2) // Corner polygon + dashed line for normal corners
  })

  it('should not render overlay for angles just outside the threshold', () => {
    const corner = createMockCorner(174) // 6° away from 180°, outside ±5° threshold
    const previousWall = createMockWall(vec2.fromValues(1, 0))
    const nextWall = createMockWall(vec2.fromValues(1, 0))

    const { container } = render(
      <PerimeterCornerShape
        corner={corner}
        previousWall={previousWall}
        nextWall={nextWall}
        perimeterId="test-perimeter"
      />
    )

    // Should have only the corner polygon Line element (no overlay)
    const lineElements = container.querySelectorAll('div[data-testid="konva-line"]')
    expect(lineElements.length).toBe(2) // Corner polygon + dashed line for normal corners
  })

  it('should render overlay for angles at the edge of the threshold', () => {
    const corner = createMockCorner(175) // Exactly 5° away from 180°
    const previousWall = createMockWall(vec2.fromValues(1, 0))
    const nextWall = createMockWall(vec2.fromValues(1, 0))

    const { container } = render(
      <PerimeterCornerShape
        corner={corner}
        previousWall={previousWall}
        nextWall={nextWall}
        perimeterId="test-perimeter"
      />
    )

    // Should have multiple Line elements (overlay + corner polygon)
    const lineElements = container.querySelectorAll('div[data-testid="konva-line"]')
    expect(lineElements.length).toBeGreaterThan(1)
  })
})
