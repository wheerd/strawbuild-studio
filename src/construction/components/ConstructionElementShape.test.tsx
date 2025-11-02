import { render } from '@testing-library/react'
import { vec3 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { createConstructionElement } from '@/construction/elements'
import type { Projection, RotationProjection } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import { createCuboidShape } from '@/construction/shapes'
import { Bounds3D } from '@/shared/geometry'

import { ConstructionElementShape } from './ConstructionElementShape'

// Mock the shape components
vi.mock('./CuboidShape', () => ({
  CuboidShape: () => <rect data-testid="cuboid-shape" />
}))

describe('ConstructionElementShape', () => {
  const mockMaterialId = 'material_test' as MaterialId

  // Mock projection functions for testing
  const mockProjection: Projection = vi.fn((p: vec3): vec3 => p)
  const mockRotationProjection: RotationProjection = vi.fn((r: vec3): number => (r[2] * 180) / Math.PI)

  const mockCuboidElement: ConstructionElement = createConstructionElement(
    mockMaterialId,
    createCuboidShape(vec3.fromValues(0, 0, 0), vec3.fromValues(100, 50, 25)),
    { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) }
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
        offset: vec3.fromValues(0, 0, 0),
        size: vec3.fromValues(100, 50, 25),
        bounds: Bounds3D.fromMinMax(vec3.fromValues(0, 0, 0), vec3.fromValues(100, 50, 25))
      },
      { position: vec3.fromValues(0, 0, 0), rotation: vec3.fromValues(0, 0, 0) }
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
