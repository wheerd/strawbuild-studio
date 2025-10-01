import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { createConstructionElement, createCuboidShape, createCutCuboidShape } from '@/construction/elements'
import type { Projection, RotationProjection } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { Vec3 } from '@/shared/geometry'

import { ConstructionElementShape } from './ConstructionElementShape'

// Mock the shape components
vi.mock('./CuboidShape', () => ({
  CuboidShape: () => <rect data-testid="cuboid-shape" />
}))

vi.mock('./CutCuboidShape', () => ({
  CutCuboidShape: () => <polygon data-testid="cut-cuboid-shape" />
}))

describe('ConstructionElementShape', () => {
  const mockMaterialId = 'material_test' as MaterialId

  // Mock projection functions for testing
  const mockProjection: Projection = vi.fn((p: Vec3): Vec3 => p)
  const mockRotationProjection: RotationProjection = vi.fn((r: Vec3): number => (r[2] * 180) / Math.PI)

  const mockCuboidElement: ConstructionElement = createConstructionElement(
    mockMaterialId,
    createCuboidShape([0, 0, 0], [100, 50, 25]),
    { position: [0, 0, 0], rotation: [0, 0, 0] }
  )

  const mockCutCuboidElement: ConstructionElement = createConstructionElement(
    mockMaterialId,
    createCutCuboidShape([0, 0, 0], [100, 50, 25], {
      plane: 'xy',
      axis: 'y',
      angle: 45
    }),
    { position: [0, 0, 0], rotation: [0, 0, 0] }
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cuboid shapes correctly', () => {
    const { getByTestId, container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toBeInTheDocument()

    // Check that the parent group has the correct CSS classes including material class
    const group = container.querySelector('g')
    expect(group).toHaveClass('construction-element')
    expect(group).toHaveClass(mockMaterialId)
  })

  it('renders cut-cuboid shapes correctly', () => {
    const { getByTestId, container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCutCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cutCuboidShape = getByTestId('cut-cuboid-shape')
    expect(cutCuboidShape).toBeInTheDocument()

    // Check CSS classes instead of inline styling
    const group = container.querySelector('g')
    expect(group).toHaveClass('construction-element')
    expect(group).toHaveClass(mockMaterialId)
  })

  it('applies material CSS class correctly', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const group = container.querySelector('g')
    expect(group).toHaveClass(mockMaterialId)
  })

  it('applies CSS classes without material resolution logic', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    // CSS classes are applied but styling is handled by injected CSS
    const group = container.querySelector('g')
    expect(group).toHaveClass('construction-element')
    expect(group).toHaveClass(mockMaterialId)
  })

  it('applies CSS classes without material resolution logic', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    // CSS classes are applied but styling is handled by injected CSS
    const group = container.querySelector('g')
    expect(group).toHaveClass('construction-element')
    expect(group).toHaveClass(mockMaterialId)
  })

  it('throws error for unsupported shape types', () => {
    const unsupportedElement: ConstructionElement = createConstructionElement(
      mockMaterialId,
      {
        type: 'unsupported-shape' as any,
        offset: [0, 0, 0],
        size: [100, 50, 25],
        bounds: { min: [0, 0, 0], max: [100, 50, 25] }
      },
      { position: [0, 0, 0], rotation: [0, 0, 0] }
    )

    expect(() => {
      render(
        <svg>
          <ConstructionElementShape
            element={unsupportedElement}
            projection={mockProjection}
            rotationProjection={mockRotationProjection}
          />
        </svg>
      )
    }).toThrow('Unsupported shape type: unsupported-shape')
  })

  it('passes through props correctly', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
          showDebugMarkers
          className="test-class"
        />
      </svg>
    )

    const group = container.querySelector('g')
    expect(group).toHaveClass('test-class')
    expect(group).toHaveClass('construction-element')
  })
})
