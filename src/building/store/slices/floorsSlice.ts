import type { StateCreator } from 'zustand'

import type { FloorArea, FloorOpening } from '@/building/model'
import type { FloorAreaId, FloorOpeningId, StoreyId } from '@/building/model/ids'
import { createFloorAreaId, createFloorOpeningId } from '@/building/model/ids'
import {
  type TimestampsState,
  removeTimestampDraft,
  updateTimestampDraft
} from '@/building/store/slices/timestampsSlice'
import {
  type Polygon2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'

export interface FloorsState {
  floorAreas: Record<FloorAreaId, FloorArea>
  floorOpenings: Record<FloorOpeningId, FloorOpening>
}

export interface FloorsActions {
  addFloorArea: (storeyId: StoreyId, polygon: Polygon2D) => FloorArea
  removeFloorArea: (floorAreaId: FloorAreaId) => void
  updateFloorArea: (floorAreaId: FloorAreaId, newPolygon: Polygon2D) => boolean
  getFloorAreaById: (floorAreaId: FloorAreaId) => FloorArea | null
  getFloorAreasByStorey: (storeyId: StoreyId) => FloorArea[]

  addFloorOpening: (storeyId: StoreyId, polygon: Polygon2D) => FloorOpening
  removeFloorOpening: (floorOpeningId: FloorOpeningId) => void
  updateFloorOpening: (floorOpeningId: FloorOpeningId, newPolygon: Polygon2D) => boolean
  getFloorOpeningById: (floorOpeningId: FloorOpeningId) => FloorOpening | null
  getFloorOpeningsByStorey: (storeyId: StoreyId) => FloorOpening[]
}

export type FloorsSlice = FloorsState & { actions: FloorsActions }

const validatePolygon = (polygon: Polygon2D): void => {
  if (polygon.points.length < 3) {
    throw new Error('Polygon must have at least 3 points')
  }

  if (wouldClosingPolygonSelfIntersect(polygon)) {
    throw new Error('Polygon must not self-intersect')
  }
}

const ensureFloorAreaPolygon = (polygon: Polygon2D): Polygon2D => {
  validatePolygon(polygon)
  return ensurePolygonIsClockwise(polygon)
}

const ensureFloorOpeningPolygon = (polygon: Polygon2D): Polygon2D => {
  validatePolygon(polygon)
  return ensurePolygonIsCounterClockwise(polygon)
}

export const createFloorsSlice: StateCreator<
  FloorsSlice & TimestampsState,
  [['zustand/immer', never]],
  [],
  FloorsSlice
> = (set, get) => ({
  floorAreas: {},
  floorOpenings: {},
  timestamps: {},

  actions: {
    addFloorArea: (storeyId: StoreyId, polygon: Polygon2D) => {
      const validatedPolygon = ensureFloorAreaPolygon(polygon)
      let floorArea: FloorArea | undefined
      set(state => {
        floorArea = {
          id: createFloorAreaId(),
          storeyId,
          area: validatedPolygon
        }
        state.floorAreas[floorArea.id] = floorArea
        updateTimestampDraft(state, floorArea.id)
      })

      if (!floorArea) {
        throw new Error('Failed to create floor area')
      }
      return floorArea
    },

    removeFloorArea: (floorAreaId: FloorAreaId) => {
      set(state => {
        const { [floorAreaId]: _removed, ...remainingFloorAreas } = state.floorAreas
        state.floorAreas = remainingFloorAreas
        removeTimestampDraft(state, floorAreaId)
      })
    },

    updateFloorArea: (floorAreaId: FloorAreaId, newPolygon: Polygon2D): boolean => {
      const validatedPolygon = ensureFloorAreaPolygon(newPolygon)
      let success = false
      set(state => {
        if (floorAreaId in state.floorAreas) {
          const floorArea = state.floorAreas[floorAreaId]
          floorArea.area = validatedPolygon
          updateTimestampDraft(state, floorArea.id)
          success = true
        }
      })
      return success
    },

    getFloorAreaById: (floorAreaId: FloorAreaId) => {
      return get().floorAreas[floorAreaId] ?? null
    },

    getFloorAreasByStorey: (storeyId: StoreyId) => {
      return Object.values(get().floorAreas).filter(area => area.storeyId === storeyId)
    },

    addFloorOpening: (storeyId: StoreyId, polygon: Polygon2D) => {
      const validatedPolygon = ensureFloorOpeningPolygon(polygon)
      let floorOpening: FloorOpening | undefined
      set(state => {
        floorOpening = {
          id: createFloorOpeningId(),
          storeyId,
          area: validatedPolygon
        }
        state.floorOpenings[floorOpening.id] = floorOpening
        updateTimestampDraft(state, floorOpening.id)
      })

      if (!floorOpening) {
        throw new Error('Failed to create floor opening')
      }
      return floorOpening
    },

    removeFloorOpening: (floorOpeningId: FloorOpeningId) => {
      set(state => {
        const { [floorOpeningId]: _removed, ...remainingFloorOpenings } = state.floorOpenings
        state.floorOpenings = remainingFloorOpenings
        removeTimestampDraft(state, floorOpeningId)
      })
    },

    updateFloorOpening: (floorOpeningId: FloorOpeningId, newPolygon: Polygon2D): boolean => {
      const validatedPolygon = ensureFloorOpeningPolygon(newPolygon)
      let success = false
      set(state => {
        if (floorOpeningId in state.floorOpenings) {
          const floorOpening = state.floorOpenings[floorOpeningId]
          floorOpening.area = validatedPolygon
          updateTimestampDraft(state, floorOpening.id)
          success = true
        }
      })
      return success
    },

    getFloorOpeningById: (floorOpeningId: FloorOpeningId) => {
      return get().floorOpenings[floorOpeningId] ?? null
    },

    getFloorOpeningsByStorey: (storeyId: StoreyId) => {
      return Object.values(get().floorOpenings).filter(opening => opening.storeyId === storeyId)
    }
  }
})
