import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CuboidShape } from './CuboidShape'
import type { Cuboid } from '@/construction/walls'

describe('CuboidShape', () => {
  const mockCuboid: Cuboid = {
    type: 'cuboid',
    position: [100, 50, 0],
    size: [500, 200, 60]
  }

  it('renders a basic cuboid as a rectangle', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} fill="#8B4513" />
      </svg>
    )

    const rect = container.querySelector('rect')
    expect(rect).toBeInTheDocument()
    expect(rect).toHaveAttribute('x', '100')
    expect(rect).toHaveAttribute('y', '-250') // -50 - 200 (Y flipped)
    expect(rect).toHaveAttribute('width', '500')
    expect(rect).toHaveAttribute('height', '200')
    expect(rect).toHaveAttribute('fill', '#8B4513')
  })

  it('applies custom stroke and strokeWidth', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} fill="#ff0000" stroke="#00ff00" strokeWidth={10} />
      </svg>
    )

    const rect = container.querySelector('rect')
    expect(rect).toHaveAttribute('stroke', '#00ff00')
    expect(rect).toHaveAttribute('stroke-width', '10')
  })

  it('shows debug markers when enabled', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} fill="#8B4513" showDebugMarkers />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveAttribute('cx', '100')
    expect(circle).toHaveAttribute('cy', '-50') // -Y coordinate
    expect(circle).toHaveAttribute('fill', 'blue')
  })

  it('does not show debug markers when disabled', () => {
    const { container } = render(
      <svg>
        <CuboidShape shape={mockCuboid} fill="#8B4513" showDebugMarkers={false} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).not.toBeInTheDocument()
  })
})
