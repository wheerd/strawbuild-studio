import { create } from 'zustand'

import type { StoreyId } from '@/building/model/ids'

import {
  type FloorPlanOrigin,
  type FloorPlanOverlay,
  type FloorPlanPlacement,
  type ImagePoint,
  type PlanImportPayload
} from './types'
import { calculateMmPerPixel, calculatePixelDistance } from './utils/calibration'

interface FloorPlanStoreState {
  plans: Record<StoreyId, FloorPlanOverlay | undefined>
}

interface FloorPlanStoreActions {
  importPlan: (payload: PlanImportPayload) => void
  setPlacement: (floorId: StoreyId, placement: FloorPlanPlacement) => void
  togglePlacement: (floorId: StoreyId) => void
  clearPlan: (floorId: StoreyId) => void
}

type FloorPlanStore = FloorPlanStoreState & { actions: FloorPlanStoreActions }

const UNDERLAY_OPACITY = 0.85
const OVERLAY_OPACITY = 0.45

function disposePlan(plan: FloorPlanOverlay | undefined): void {
  if (plan) {
    URL.revokeObjectURL(plan.image.url)
  }
}

function getDefaultOrigin(referencePoints: readonly [ImagePoint, ImagePoint]): FloorPlanOrigin {
  return {
    image: referencePoints[0],
    world: { x: 0, y: 0 }
  }
}

export const useFloorPlanStore = create<FloorPlanStore>()((set, get) => ({
  plans: {},
  actions: {
    importPlan: ({ floorId, file, imageSize, referencePoints, realDistanceMm, origin }) => {
      const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
      const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

      const nextPlan: FloorPlanOverlay = {
        floorId,
        image: {
          url: URL.createObjectURL(file),
          name: file.name,
          width: imageSize.width,
          height: imageSize.height
        },
        calibration: {
          referencePoints,
          pixelDistance,
          realDistanceMm,
          mmPerPixel
        },
        origin: origin ?? getDefaultOrigin(referencePoints),
        placement: 'over',
        opacity: OVERLAY_OPACITY
      }

      set(state => {
        disposePlan(state.plans[floorId])
        return {
          plans: {
            ...state.plans,
            [floorId]: nextPlan
          }
        }
      })
    },

    setPlacement: (floorId, placement) => {
      set(state => {
        const plan = state.plans[floorId]
        if (!plan) {
          return state
        }

        return {
          plans: {
            ...state.plans,
            [floorId]: {
              ...plan,
              placement,
              opacity: placement === 'under' ? UNDERLAY_OPACITY : OVERLAY_OPACITY
            }
          }
        }
      })
    },

    togglePlacement: floorId => {
      const { plans } = get()
      const current = plans[floorId]
      const nextPlacement: FloorPlanPlacement = current?.placement === 'under' ? 'over' : 'under'
      get().actions.setPlacement(floorId, nextPlacement)
    },

    clearPlan: floorId => {
      set(state => {
        const existing = state.plans[floorId]
        if (!existing) {
          return state
        }

        disposePlan(existing)
        const { [floorId]: _, ...rest } = state.plans
        return {
          plans: rest
        }
      })
    }
  }
}))

export const useFloorPlanForStorey = (floorId: StoreyId | null | undefined): FloorPlanOverlay | null =>
  useFloorPlanStore(state => {
    if (!floorId) {
      return null
    }
    return state.plans[floorId] ?? null
  })

export const useFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore(state => state.actions)

export const getFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore.getState().actions

export const getAllFloorPlans = (): Record<StoreyId, FloorPlanOverlay | undefined> => useFloorPlanStore.getState().plans

export function resetFloorPlanStore(): void {
  const { actions } = useFloorPlanStore.getState()
  Object.values(useFloorPlanStore.getState().plans).forEach(disposePlan)
  useFloorPlanStore.setState({ plans: {}, actions })
}
