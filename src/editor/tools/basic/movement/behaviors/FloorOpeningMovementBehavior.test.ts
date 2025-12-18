import { describe, expect, it, vi } from 'vitest'

import type { FloorOpening } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import { SnappingService } from '@/editor/services/snapping/SnappingService'
import { type Vec2, copyVec2, newVec2 } from '@/shared/geometry'

import { FloorOpeningMovementBehavior, type FloorOpeningMovementState } from './FloorOpeningMovementBehavior'

const createVec = (x: number, y: number) => newVec2(x, y)

function createFloorOpening(id: string, points: Vec2[], storeyId = 'storey_1'): FloorOpening {
  return {
    id,
    storeyId,
    area: { points }
  } as FloorOpening
}

describe('FloorOpeningMovementBehavior', () => {
  const opening = createFloorOpening('flooropening_1', [
    createVec(500, 500),
    createVec(800, 500),
    createVec(800, 800),
    createVec(500, 800)
  ])

  const updateFloorOpening = vi.fn((id: string, polygon: { points: Vec2[] }) => {
    if (id === opening.id) {
      opening.area = {
        points: polygon.points.map(point => copyVec2(point))
      }
    }
    return true
  })

  const storeActions = {
    getFloorOpeningById: (id: string) => (id === opening.id ? opening : null),
    getFloorAreasByStorey: () => [],
    getPerimetersByStorey: () => [],
    getFloorOpeningsByStorey: () => [opening],
    updateFloorOpening,
    updateFloorArea: vi.fn()
  } as unknown as StoreActions

  const behavior = new FloorOpeningMovementBehavior()
  const entityContext = behavior.getEntity(opening.id, [], storeActions)

  const baseContext = {
    entityId: opening.id,
    parentIds: [],
    entity: entityContext,
    store: storeActions,
    snappingService: new SnappingService()
  } satisfies Parameters<typeof behavior.commitMovement>[1]

  it('commits movement by updating the floor opening polygon', () => {
    updateFloorOpening.mockClear()
    const movementState: FloorOpeningMovementState = {
      previewPolygon: opening.area.points,
      movementDelta: newVec2(100, 100)
    }

    const result = behavior.commitMovement(movementState, baseContext)

    expect(result).toBe(true)
    expect(updateFloorOpening).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorOpening.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(newVec2(600, 600))
  })

  it('applies relative movement using the latest geometry', () => {
    updateFloorOpening.mockClear()
    const deltaDifference = newVec2(-50, 40)

    const result = behavior.applyRelativeMovement(deltaDifference, baseContext)

    expect(result).toBe(true)
    expect(updateFloorOpening).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorOpening.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(newVec2(550, 640))
  })
})
