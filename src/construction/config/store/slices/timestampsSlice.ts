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

export interface TimestampsDraftState {
  timestamps: Record<AssemblyId, number>
}

export const updateTimestampDraft = (draft: TimestampsDraftState, ...entityIds: AssemblyId[]) => {
  const now = Date.now()
  for (const entityId of entityIds) {
    draft.timestamps[entityId] = now
  }
}

export const removeTimestampDraft = (draft: TimestampsDraftState, ...entityIds: AssemblyId[]) => {
  for (const entityId of entityIds) {
    delete draft.timestamps[entityId]
  }
}

export const createTimestampsSlice: StateCreator<TimestampsSlice, [['zustand/immer', never]], [], TimestampsSlice> = (
  set,
  get
) => ({
  timestamps: {},

  actions: {
    getTimestamp: entityId => get().timestamps[entityId] ?? null,

    updateTimestamp: (...entityIds: AssemblyId[]) => {
      set(state => {
        updateTimestampDraft(state, ...entityIds)
      })
    },

    removeTimestamp: (...entityIds: AssemblyId[]) => {
      set(state => {
        removeTimestampDraft(state, ...entityIds)
      })
    },

    clearAll: () => {
      set(state => {
        state.timestamps = {}
      })
    }
  }
})
