import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ConstructionElementShape } from './ConstructionElementShape'
import type { ConstructionElement, ResolveMaterialFunction, MaterialId } from '@/construction'
import type { Length } from '@/types/geometry'
import { createConstructionElementId } from '@/construction'

// Mock the shape components
vi.mock('./CuboidShape', () => ({
  CuboidShape: ({ fill }: { fill: string }) => <rect data-testid="cuboid-shape" data-fill={fill} />
}))

vi.mock('./CutCuboidShape', () => ({
  CutCuboidShape: ({ fill }: { fill: string }) => <polygon data-testid="cut-cuboid-shape" data-fill={fill} />
}))

describe('ConstructionElementShape', () => {
  const mockMaterialId = 'material_test' as MaterialId

  const mockResolveMaterial: ResolveMaterialFunction = vi.fn((id: MaterialId) => ({
    id,
    name: 'Test Material',
    type: 'dimensional' as const,
    color: '#FF0000',
    width: 100 as Length,
    thickness: 50 as Length,
    availableLengths: [1000 as Length]
  }))

  const mockCuboidElement: ConstructionElement = {
    id: createConstructionElementId(),
    type: 'plate',
    material: mockMaterialId,
    shape: {
      type: 'cuboid',
      position: [0, 0, 0],
      size: [100, 50, 25]
    }
  }

  const mockCutCuboidElement: ConstructionElement = {
    id: createConstructionElementId(),
    type: 'plate',
    material: mockMaterialId,
    shape: {
      type: 'cut-cuboid',
      position: [0, 0, 0],
      size: [100, 50, 25],
      startCut: {
        plane: 'xy',
        axis: 'y',
        angle: 45
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cuboid shapes correctly', () => {
    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape element={mockCuboidElement} resolveMaterial={mockResolveMaterial} />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toBeInTheDocument()
    expect(cuboidShape).toHaveAttribute('data-fill', '#FF0000')
  })

  it('renders cut-cuboid shapes correctly', () => {
    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape element={mockCutCuboidElement} resolveMaterial={mockResolveMaterial} />
      </svg>
    )

    const cutCuboidShape = getByTestId('cut-cuboid-shape')
    expect(cutCuboidShape).toBeInTheDocument()
    expect(cutCuboidShape).toHaveAttribute('data-fill', '#FF0000')
  })

  it('uses material color for fill', () => {
    const customMaterialResolver: ResolveMaterialFunction = vi.fn(() => ({
      id: mockMaterialId,
      name: 'Custom Material',
      type: 'dimensional' as const,
      color: '#00FF00',
      width: 100 as Length,
      thickness: 50 as Length,
      availableLengths: [1000 as Length]
    }))

    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape element={mockCuboidElement} resolveMaterial={customMaterialResolver} />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toHaveAttribute('data-fill', '#00FF00')
  })

  it('uses fallback color when material is not found', () => {
    const failingResolver: ResolveMaterialFunction = vi.fn(() => undefined)

    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape element={mockCuboidElement} resolveMaterial={failingResolver} />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toHaveAttribute('data-fill', '#8B4513') // fallback color
  })

  it('throws error for unsupported shape types', () => {
    const unsupportedElement: ConstructionElement = {
      id: createConstructionElementId(),
      type: 'plate',
      material: mockMaterialId,
      shape: {
        type: 'unsupported-shape' as any,
        position: [0, 0, 0],
        size: [100, 50, 25]
      }
    }

    expect(() => {
      render(
        <svg>
          <ConstructionElementShape element={unsupportedElement} resolveMaterial={mockResolveMaterial} />
        </svg>
      )
    }).toThrow('Unsupported shape type: unsupported-shape')
  })

  it('passes through props correctly', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          resolveMaterial={mockResolveMaterial}
          stroke="#0000FF"
          strokeWidth={10}
          showDebugMarkers
          className="test-class"
        />
      </svg>
    )

    const group = container.querySelector('g')
    expect(group).toHaveClass('test-class')
  })
})
