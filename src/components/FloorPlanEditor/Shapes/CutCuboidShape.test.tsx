import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CutCuboidShape } from './CutCuboidShape'
import type { CutCuboid } from '@/construction'

describe('CutCuboidShape', () => {
  const mockCutCuboid: CutCuboid = {
    type: 'cut-cuboid',
    position: [100, 50, 0],
    size: [500, 200, 60],
    startCut: {
      plane: 'xy',
      axis: 'y',
      angle: 45
    },
    endCut: {
      plane: 'xy',
      axis: 'y',
      angle: -30
    }
  }

  it('renders a cut cuboid as a polygon', () => {
    const { container } = render(
      <svg>
        <CutCuboidShape shape={mockCutCuboid} fill="#8B4513" />
      </svg>
    )

    const polygon = container.querySelector('polygon')
    expect(polygon).toBeInTheDocument()
    expect(polygon).toHaveAttribute('fill', '#8B4513')
    expect(polygon).toHaveAttribute('points')
  })

  it('calculates correct polygon points for angled cuts', () => {
    const simpleCuboid: CutCuboid = {
      type: 'cut-cuboid',
      position: [0, 0, 0],
      size: [100, 100, 60],
      startCut: {
        plane: 'xy',
        axis: 'y',
        angle: 45
      }
    }

    const { container } = render(
      <svg>
        <CutCuboidShape shape={simpleCuboid} fill="#8B4513" />
      </svg>
    )

    const polygon = container.querySelector('polygon')
    const points = polygon?.getAttribute('points')

    // With a 45° cut on a 100mm width, the offset should be 100
    // Start cut moves top-left point right by the offset
    expect(points).toContain('100,-100') // top-left moved right
    expect(points).toContain('100,0') // top-right
    expect(points).toContain('0,0') // bottom-right
    expect(points).toContain('0,0') // bottom-left
  })

  it('handles negative cut angles correctly', () => {
    const negativeCutCuboid: CutCuboid = {
      type: 'cut-cuboid',
      position: [0, 0, 0],
      size: [100, 100, 60],
      endCut: {
        plane: 'xy',
        axis: 'y',
        angle: -45
      }
    }

    const { container } = render(
      <svg>
        <CutCuboidShape shape={negativeCutCuboid} fill="#8B4513" />
      </svg>
    )

    const polygon = container.querySelector('polygon')
    expect(polygon).toBeInTheDocument()
    expect(polygon?.getAttribute('points')).toBeTruthy()
  })

  it('shows debug markers and cut angles when enabled', () => {
    const { container } = render(
      <svg>
        <CutCuboidShape shape={mockCutCuboid} fill="#8B4513" showDebugMarkers />
      </svg>
    )

    // Check for origin marker
    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    expect(circle).toHaveAttribute('fill', 'blue')

    // Check for cut angle text
    const texts = container.querySelectorAll('text')
    expect(texts).toHaveLength(2) // start and end cut angles
    expect(texts[0].textContent).toContain('Start: 45.0°')
    expect(texts[1].textContent).toContain('End: -30.0°')
  })

  it('does not show debug markers when disabled', () => {
    const { container } = render(
      <svg>
        <CutCuboidShape shape={mockCutCuboid} fill="#8B4513" showDebugMarkers={false} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).not.toBeInTheDocument()

    const texts = container.querySelectorAll('text')
    expect(texts).toHaveLength(0)
  })

  it('handles cuboid without cuts', () => {
    const noCutCuboid: CutCuboid = {
      type: 'cut-cuboid',
      position: [0, 0, 0],
      size: [100, 100, 60]
    }

    const { container } = render(
      <svg>
        <CutCuboidShape shape={noCutCuboid} fill="#8B4513" />
      </svg>
    )

    const polygon = container.querySelector('polygon')
    expect(polygon).toBeInTheDocument()

    // Should render as a regular rectangle
    const points = polygon?.getAttribute('points')
    expect(points).toBe('0,0 0,-100 100,-100 100,0')
  })
})
