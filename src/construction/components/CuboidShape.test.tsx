import { render } from '@testing-library/react'
import { vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import type { Cuboid } from '@/construction/shapes'

import { CuboidShape } from './CuboidShape'

describe('CuboidShape', () => {
  const mockCuboid: Cuboid = {
    type: 'cuboid',
    offset: vec3.fromValues(100, 50, 0),
    size: vec3.fromValues(500, 200, 60),
    bounds: { min: vec3.fromValues(100, 50, 0), max: vec3.fromValues(600, 250, 60) }
  }

  // Mock projection function
  const mockProjection = (p: vec3): vec3 => [p[0], -p[1], p[2]] // Simple Y-flip projection

  it('renders a basic cuboid as a rectangle', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} projection={mockProjection} />
      </svg>
    )

    const rect = container.querySelector('rect')
    expect(rect).toBeInTheDocument()
    expect(rect).toHaveAttribute('x', '100')
    expect(rect).toHaveAttribute('y', '-250') // -50 - 200 (Y flipped)
    expect(rect).toHaveAttribute('width', '500')
    expect(rect).toHaveAttribute('height', '200')
    // Styling is now handled by CSS classes, not inline attributes
  })

  it('renders rect element without inline styling', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} projection={mockProjection} />
      </svg>
    )

    const rect = container.querySelector('rect')
    expect(rect).toBeInTheDocument()
    // CSS-based styling - no inline fill/stroke attributes
    expect(rect).not.toHaveAttribute('fill')
    expect(rect).not.toHaveAttribute('stroke')
    expect(rect).not.toHaveAttribute('stroke-width')
  })

  it('shows debug markers when enabled', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} projection={mockProjection} showDebugMarkers />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveAttribute('cx', '100')
    expect(circle).toHaveAttribute('cy', '-250') // Projected Y coordinate from bounds
    expect(circle).toHaveAttribute('fill', 'blue')
  })

  it('does not show debug markers when disabled', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} projection={mockProjection} showDebugMarkers={false} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).not.toBeInTheDocument()
  })
})
