import isDeepEqual from 'fast-deep-equal'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { type PerimeterId } from '@/building/model/ids'

import { CURRENT_VERSION, applyMigrations } from './migrations'
import { getPersistenceActions } from './persistenceStore'
import { createConstraintsSlice, rebuildReverseIndex } from './slices/constraintsSlice'
import { createFloorsSlice } from './slices/floorsSlice'
import { updatePerimeterGeometry } from './slices/perimeterGeometry'
import { createPerimetersSlice } from './slices/perimeterSlice'
import { createRoofsSlice } from './slices/roofsSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import { createTimestampsSlice } from './slices/timestampsSlice'
import type { Store, StoreActions, StoreState } from './types'

const createDebouncedSave = (debounceTimeMs: number) => {
  let saveTimeout: NodeJS.Timeout | null = null

  return (name: string, value: unknown) => {
    const persistenceActions = getPersistenceActions()
    persistenceActions.setSaving(true)

    if (saveTimeout) clearTimeout(saveTimeout)

    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(name, JSON.stringify(value))
        persistenceActions.setSaveSuccess(new Date())
      } catch (error) {
        persistenceActions.setSaveError(error instanceof Error ? error.message : 'Save failed')
      }
    }, debounceTimeMs)
  }
}

export const useModelStore = create<Store>()(
  subscribeWithSelector(
    persist(
      temporal(
        (set, get, store) => {
          const storeysSlice = immer(createStoreysSlice)(set, get, store)
          const perimetersSlice = immer(createPerimetersSlice)(set, get, store)
          const floorsSlice = immer(createFloorsSlice)(set, get, store)
          const roofsSlice = immer(createRoofsSlice)(set, get, store)
          const timestampsSlice = immer(createTimestampsSlice)(set, get, store)
          const constraintsSlice = immer(createConstraintsSlice)(set, get, store)

          return {
            ...storeysSlice,
            ...perimetersSlice,
            ...floorsSlice,
            ...roofsSlice,
            ...timestampsSlice,
            ...constraintsSlice,
            actions: {
              ...storeysSlice.actions,
              ...perimetersSlice.actions,
              ...floorsSlice.actions,
              ...roofsSlice.actions,
              ...timestampsSlice.actions,
              ...constraintsSlice.actions,
              reset: () => {
                set(store.getInitialState())
              }
            }
          }
        },
        {
          // Undo/redo configuration
          limit: 50,
          equality: (pastState, currentState) => isDeepEqual(pastState, currentState),
          handleSet: handleSet => {
            let timeoutId: ReturnType<typeof setTimeout> | undefined
            let firstPastState: Parameters<typeof handleSet>[0]
            return (...args: Parameters<typeof handleSet>) => {
              // Capture pastState from the first call in a burst
              if (timeoutId === undefined) {
                firstPastState = args[0]
              }
              clearTimeout(timeoutId)
              timeoutId = setTimeout(() => {
                timeoutId = undefined
                // Use pastState from the first call (the true "before" state)
                // but keep the remaining args from the last call
                args[0] = firstPastState
                handleSet(...args)
              }, 500)
            }
          }
        }
      ),
      {
        // Persistence configuration
        name: 'strawbaler-model',
        version: CURRENT_VERSION,
        migrate: (persistedState: unknown, version: number) => applyMigrations(persistedState, version) as StoreState,
        partialize: state => {
          const {
            actions: _actions,
            _perimeterGeometry,
            _perimeterWallGeometry,
            _perimeterCornerGeometry,
            _openingGeometry,
            _wallPostGeometry,
            _constraintsByEntity,
            ...rest
          } = state as StoreState & { actions: unknown }
          return rest
        },
        storage: {
          getItem: name => {
            const item = localStorage.getItem(name)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return item ? JSON.parse(item) : null
          },
          setItem: createDebouncedSave(1000),
          removeItem: name => {
            localStorage.removeItem(name)
          }
        },
        onRehydrateStorage: () => state => {
          if (state) {
            regenerateDerivedState(state)

            const persistenceActions = getPersistenceActions()
            persistenceActions.setHydrated(true)
          }
        }
      }
    )
  )
)

export const getModelActions = (): StoreActions => useModelStore.getState().actions

export const getUndoFunction = (): (() => void) => useModelStore.temporal.getState().undo
export const getRedoFunction = (): (() => void) => useModelStore.temporal.getState().redo
export const getCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const getCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

export const clearPersistence = (): void => {
  localStorage.removeItem('strawbaler-model')
}

export function regenerateDerivedState(state: StoreState): void {
  for (const perimeterId of Object.keys(state.perimeters)) {
    updatePerimeterGeometry(state, perimeterId as PerimeterId)
  }

  state._constraintsByEntity = {}
  rebuildReverseIndex(state)
}
