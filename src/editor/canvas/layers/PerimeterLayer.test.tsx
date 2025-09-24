import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Stage } from 'react-konva/lib/ReactKonvaCore'
import { PerimeterLayer } from './PerimeterLayer'
import { usePerimetersOfActiveStorey } from '@/building/store'
import type { PerimeterId, StoreyId } from '@/shared/types/ids'

// Mock the model store hook
vi.mock('@/building/store', () => ({
  usePerimetersOfActiveStorey: vi.fn()
}))
vi.mock('@/shared/components/FloorPlanEditor/Shapes/PerimeterShape', () => ({
  PerimeterShape: ({ perimeter }: any) => <div data-id={perimeter.id}>PerimeterShape</div>
}))

// Type assertion for the mocked hook

const mockUsePerimetersOfActiveStorey = vi.mocked(usePerimetersOfActiveStorey)

describe('PerimeterLayer', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUsePerimetersOfActiveStorey.mockReset()
    mockUsePerimetersOfActiveStorey.mockReturnValue([]) // Default to no perimeters
  })

  it('should render without perimeters', () => {
    const result = render(
      <Stage width={800} height={600}>
        <PerimeterLayer />
      </Stage>
    )

    expect(result.container).toMatchSnapshot()
  })

  it('should render perimeters when they exist', () => {
    mockUsePerimetersOfActiveStorey.mockReturnValue([
      {
        id: 'perimeter1' as PerimeterId,
        storeyId: 'storey1' as StoreyId,
        walls: [],
        corners: []
      }
    ])

    const result = render(
      <Stage width={800} height={600}>
        <PerimeterLayer />
      </Stage>
    )

    expect(result.container).toMatchSnapshot()
  })
})
