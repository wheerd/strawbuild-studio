import type { StateCreator } from 'zustand'

import type { EntityId } from '@/building/model/ids'

export interface TimestampsState {
  readonly timestamps: Record<EntityId, number>
}

export interface TimestampsActions {
  getTimestamp: (entityId: EntityId) => number | null
  updateTimestamp: (...entityIds: EntityId[]) => void
  removeTimestamp: (...entityIds: EntityId[]) => void
  clearAll: () => void
}

export type TimestampsSlice = TimestampsState & { actions: TimestampsActions }

export const createTimestampsSlice: StateCreator<TimestampsSlice, [['zustand/immer', never]], [], TimestampsSlice> = (
  set,
  get
) => ({
  timestamps: {},

  actions: {
    getTimestamp: entityId => get().timestamps[entityId] ?? null,

    updateTimestamp: (...entityIds: EntityId[]) => {
      set(state => {
        const now = Date.now()
        for (const entityId of entityIds) {
          state.timestamps[entityId] = now
        }
      })
    },

    removeTimestamp: (...entityIds: EntityId[]) => {
      set(state => {
        for (const entityId of entityIds) {
          delete state.timestamps[entityId]
        }
      })
    },

    clearAll: () => {
      set(state => {
        state.timestamps = {}
      })
    }
  }
})
