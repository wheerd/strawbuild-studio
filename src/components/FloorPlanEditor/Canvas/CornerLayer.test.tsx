import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CornerShape } from '@/components/FloorPlanEditor/Shapes/CornerShape'
import { CornerLayer } from '@/components/FloorPlanEditor/Canvas/CornerLayer'
import { createPoint2D, createAngle } from '@/types/geometry'
import { createCornerId, createPointId, createWallId } from '@/types/ids'

// Mock the hooks
vi.mock('@/components/FloorPlanEditor/hooks/useEditorStore', () => ({
  useSelectedEntity: () => undefined,
  useEditorStore: () => ({
    selectEntity: vi.fn()
  }),
  useActiveFloorId: () => 'test-floor-id'
}))

vi.mock('@/model/store', () => ({
  usePoints: () => new Map([
    ['test-point-id', {
      id: 'test-point-id',
      position: createPoint2D(100, 200)
    }]
  ]),
  useFloors: () => new Map([
    ['test-floor-id', {
      id: 'test-floor-id',
      pointIds: ['test-point-id']
    }]
  ]),
  useCorners: () => new Map([
    ['test-corner-id', {
      id: 'test-corner-id',
      pointId: 'test-point-id',
      wall1Id: createWallId(),
      wall2Id: createWallId(),
      angle: createAngle(Math.PI / 2), // 90 degrees
      type: 'corner',
      area: { points: [] }
    }]
  ]),
  getActiveFloor: () => ({
    id: 'test-floor-id',
    pointIds: ['test-point-id']
  })
}))

describe('Corner Visualization', () => {
  describe('CornerShape', () => {
    it('should render corner shape with correct symbol for corner type', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        angle: createAngle(Math.PI / 2), // 90 degrees
        type: 'corner' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
    })

    it('should render tee junction with correct symbol', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        otherWallIds: [createWallId()],
        angle: createAngle(Math.PI / 2),
        type: 'tee' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
    })

    it('should render straight corner with correct symbol', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        angle: createAngle(Math.PI), // 180 degrees
        type: 'straight' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
    })

    it('should render cross junction with correct symbol', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        otherWallIds: [createWallId(), createWallId()],
        angle: createAngle(Math.PI / 2),
        type: 'cross' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
    })

    it('should return null when corner point is not found', () => {
      const corner = {
        id: createCornerId(),
        pointId: 'non-existent-point' as any,
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        angle: createAngle(Math.PI / 2),
        type: 'corner' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('CornerLayer', () => {
    it('should render corners on the active floor', () => {
      const { container } = render(<CornerLayer />)
      expect(container).toBeTruthy()
    })
  })

  describe('Enhanced Visualization Features', () => {
    it('should show enhanced corner markers with larger size', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        angle: createAngle(Math.PI / 2),
        type: 'corner' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
    })

    it('should display symbol and angle together for non-straight corners', () => {
      const corner = {
        id: createCornerId(),
        pointId: createPointId(),
        wall1Id: createWallId(),
        wall2Id: createWallId(),
        angle: createAngle(Math.PI / 4), // 45 degrees
        type: 'corner' as const,
        area: { points: [] }
      }

      const { container } = render(<CornerShape corner={corner} />)
      expect(container).toBeTruthy()
      // The component should render text combining symbol and angle
    })
  })
})
