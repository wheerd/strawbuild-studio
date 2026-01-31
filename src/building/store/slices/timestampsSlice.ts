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

export interface TimestampsDraftState {
  timestamps: Record<EntityId, number>
}

export const updateTimestampDraft = (draft: { timestamps: Record<EntityId, number> }, ...entityIds: EntityId[]) => {
  const now = Date.now()
  for (const entityId of entityIds) {
    draft.timestamps[entityId] = now
  }
}

export const removeTimestampDraft = (draft: { timestamps: Record<EntityId, number> }, ...entityIds: EntityId[]) => {
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

    updateTimestamp: (...entityIds: EntityId[]) => {
      set(state => {
        updateTimestampDraft(state, ...entityIds)
      })
    },

    removeTimestamp: (...entityIds: EntityId[]) => {
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
