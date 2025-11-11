import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreyId } from '@/building/model/ids'

import { getFloorPlanActions, resetFloorPlanStore, useFloorPlanStore } from './store'

const floorId = 'floor-1' as StoreyId

function createTestFile(name = 'plan.png'): File {
  return new File(['blueprint'], name, { type: 'image/png' })
}

describe('floor plan store', () => {
  let urlCounter = 0
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    urlCounter = 0
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:plan-${urlCounter++}`)
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    })
    resetFloorPlanStore()
  })

  afterEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL
    })
    resetFloorPlanStore()
  })

  it('stores a plan with calibration metadata', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 2000, height: 1000 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      realDistanceMm: 5000
    })

    const plan = useFloorPlanStore.getState().plans[floorId]
    expect(plan).toBeTruthy()
    expect(plan?.image.width).toBe(2000)
    expect(plan?.calibration.pixelDistance).toBeCloseTo(100)
    expect(plan?.calibration.mmPerPixel).toBeCloseTo(50)
    expect(plan?.origin.image).toEqual({ x: 0, y: 0 })
  })

  it('toggles placement and opacity', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 500, height: 500 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 50, y: 0 }
      ],
      realDistanceMm: 500
    })

    actions.togglePlacement(floorId)
    let plan = useFloorPlanStore.getState().plans[floorId]
    expect(plan?.placement).toBe('under')
    expect(plan?.opacity).toBeGreaterThan(0.8)

    actions.togglePlacement(floorId)
    plan = useFloorPlanStore.getState().plans[floorId]
    expect(plan?.placement).toBe('over')
  })

  it('clears plans and revokes object urls', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 800, height: 600 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ],
      realDistanceMm: 1000
    })

    actions.clearPlan(floorId)

    expect(useFloorPlanStore.getState().plans[floorId]).toBeUndefined()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })
})
