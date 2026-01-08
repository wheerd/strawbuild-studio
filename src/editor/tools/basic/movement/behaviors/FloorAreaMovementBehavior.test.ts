import { describe, expect, it, vi } from 'vitest'

import type { FloorArea } from '@/building/model'
import type { StoreActions } from '@/building/store/types'
import { SnappingService } from '@/editor/services/snapping/SnappingService'
import { type Vec2, copyVec2, newVec2 } from '@/shared/geometry'

import { FloorAreaMovementBehavior, type FloorAreaMovementState } from './FloorAreaMovementBehavior'

const createVec = (x: number, y: number) => newVec2(x, y)

function createFloorArea(id: string, points: Vec2[], storeyId = 'storey_1'): FloorArea {
  return {
    id,
    storeyId,
    area: { points }
  } as FloorArea
}

describe('FloorAreaMovementBehavior', () => {
  const floorArea = createFloorArea('floorarea_1', [
    createVec(0, 0),
    createVec(1000, 0),
    createVec(1000, 1000),
    createVec(0, 1000)
  ])

  const updateFloorArea = vi.fn((id: string, polygon: { points: Vec2[] }) => {
    if (id === floorArea.id) {
      floorArea.area = {
        points: polygon.points.map(point => copyVec2(point))
      }
    }
    return true
  })

  const storeActions = {
    getFloorAreaById: (id: string) => (id === floorArea.id ? floorArea : null),
    getPerimetersByStorey: () => [],
    getFloorAreasByStorey: () => [floorArea],
    getFloorOpeningsByStorey: () => [],
    updateFloorArea,
    updateFloorOpening: vi.fn()
  } as unknown as StoreActions

  const behavior = new FloorAreaMovementBehavior()
  const entityContext = behavior.getEntity(floorArea.id, [], storeActions)

  const baseContext = {
    entityId: floorArea.id,
    parentIds: [],
    entity: entityContext,
    store: storeActions,
    snappingService: new SnappingService()
  } satisfies Parameters<typeof behavior.commitMovement>[1]

  it('commits movement by translating all points', () => {
    updateFloorArea.mockClear()
    const movementState: FloorAreaMovementState = {
      previewPolygon: floorArea.area.points,
      movementDelta: newVec2(100, 50)
    }

    const result = behavior.commitMovement(movementState, baseContext)

    expect(result).toBe(true)
    expect(updateFloorArea).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorArea.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(newVec2(100, 50))
  })

  it('applies relative movement by offsetting current geometry', () => {
    updateFloorArea.mockClear()

    const deltaDifference = newVec2(25, -30)
    const result = behavior.applyRelativeMovement(deltaDifference, baseContext)

    expect(result).toBe(true)
    expect(updateFloorArea).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorArea.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(newVec2(125, 20))
  })
})
