import { vec2 } from 'gl-matrix'
import { describe, expect, it, vi } from 'vitest'

import type { FloorOpening } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import { SnappingService } from '@/editor/services/snapping/SnappingService'

import { FloorOpeningMovementBehavior, type FloorOpeningMovementState } from './FloorOpeningMovementBehavior'

const createVec = (x: number, y: number) => vec2.fromValues(x, y)

function createFloorOpening(id: string, points: vec2[], storeyId = 'storey_1'): FloorOpening {
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

  const updateFloorOpening = vi.fn((id: string, polygon: { points: vec2[] }) => {
    if (id === opening.id) {
      opening.area = {
        points: polygon.points.map(point => vec2.clone(point))
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
      movementDelta: vec2.fromValues(100, 100)
    }

    const result = behavior.commitMovement(movementState, baseContext)

    expect(result).toBe(true)
    expect(updateFloorOpening).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorOpening.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(vec2.fromValues(600, 600))
  })

  it('applies relative movement using the latest geometry', () => {
    updateFloorOpening.mockClear()
    const deltaDifference = vec2.fromValues(-50, 40)

    const result = behavior.applyRelativeMovement(deltaDifference, baseContext)

    expect(result).toBe(true)
    expect(updateFloorOpening).toHaveBeenCalledTimes(1)
    const updatedPoints = updateFloorOpening.mock.calls[0][1].points
    expect(updatedPoints[0]).toEqual(vec2.fromValues(550, 640))
  })
})
