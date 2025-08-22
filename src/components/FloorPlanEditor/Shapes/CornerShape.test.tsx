import { render } from '@testing-library/react'
import { CornerShape } from './CornerShape'
import { useSelectedEntity, useEditorStore } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints } from '@/model/store'
import { vi } from 'vitest'
import type { Corner, Point } from '@/types/model'
import { createCornerId, createPointId, createWallId } from '@/types/ids'
import { createAngle, createPoint2D } from '@/types/geometry'

// Mock the hooks
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore')
vi.mock('@/model/store')

const mockUseSelectedEntity = vi.mocked(useSelectedEntity)
const mockSelectEntity = vi.fn()
const mockUseEditorStore = vi.mocked(useEditorStore)
const mockUsePoints = vi.mocked(usePoints)

// Create test IDs
const testCornerId = createCornerId()
const testPointId = createPointId()
const testWall1Id = createWallId()
const testWall2Id = createWallId()

// Mock corner data
const mockCorner: Corner = {
  id: testCornerId,
  type: 'corner',
  pointId: testPointId,
  wall1Id: testWall1Id,
  wall2Id: testWall2Id,
  angle: createAngle(Math.PI / 2), // 90 degrees
  area: { points: [] }
}

const mockPoint: Point = {
  id: testPointId,
  position: createPoint2D(100, 100)
}

describe('CornerShape', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockUsePoints.mockReturnValue(new Map([[testPointId, mockPoint]]))
    mockUseEditorStore.mockReturnValue(mockSelectEntity)
  })

  describe('snapshots', () => {
    it('renders unselected corner', () => {
      mockUseSelectedEntity.mockReturnValue(undefined)

      const { container } = render(<CornerShape corner={mockCorner} />)
      expect(container).toMatchSnapshot()
    })

    it('renders selected corner', () => {
      mockUseSelectedEntity.mockReturnValue(testCornerId)

      const { container } = render(<CornerShape corner={mockCorner} />)
      expect(container).toMatchSnapshot()
    })

    it('renders selected tee corner with angle display', () => {
      mockUseSelectedEntity.mockReturnValue(testCornerId)

      const teeCorner: Corner = {
        ...mockCorner,
        type: 'tee',
        angle: createAngle(Math.PI / 3) // 60 degrees
      }

      const { container } = render(<CornerShape corner={teeCorner} />)
      expect(container).toMatchSnapshot()
    })

    it('renders selected cross corner', () => {
      mockUseSelectedEntity.mockReturnValue(testCornerId)

      const crossCorner: Corner = {
        ...mockCorner,
        type: 'cross',
        angle: createAngle(Math.PI / 4) // 45 degrees
      }

      const { container } = render(<CornerShape corner={crossCorner} />)
      expect(container).toMatchSnapshot()
    })

    it('renders selected straight corner (no angle text)', () => {
      mockUseSelectedEntity.mockReturnValue(testCornerId)

      const straightCorner: Corner = {
        ...mockCorner,
        type: 'straight',
        angle: createAngle(0)
      }

      const { container } = render(<CornerShape corner={straightCorner} />)
      expect(container).toMatchSnapshot()
    })
  })

  it('returns null when corner point is not found', () => {
    mockUseSelectedEntity.mockReturnValue(undefined)
    mockUsePoints.mockReturnValue(new Map()) // Empty map

    const result = render(<CornerShape corner={mockCorner} />)

    // The component should return null when point is not found
    expect(result.container).toBeEmptyDOMElement()
  })
})
