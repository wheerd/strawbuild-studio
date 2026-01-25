import type { StateCreator } from 'zustand'

import type { AssemblyId } from '@/building/model/ids'

export interface TimestampsState {
  readonly timestamps: Record<AssemblyId, number>
}

export interface TimestampsActions {
  getTimestamp: (entityId: AssemblyId) => number | null
  updateTimestamp: (...entityIds: AssemblyId[]) => void
  removeTimestamp: (...entityIds: AssemblyId[]) => void
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

    updateTimestamp: (...entityIds: AssemblyId[]) => {
      set(state => {
        const now = Date.now()
        for (const entityId of entityIds) {
          state.timestamps[entityId] = now
        }
      })
    },

    removeTimestamp: (...entityIds: AssemblyId[]) => {
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
