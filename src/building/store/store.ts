import isDeepEqual from 'fast-deep-equal'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { type PerimeterId, type StoreyId } from '@/building/model/ids'
import { Bounds2D } from '@/shared/geometry'

import { CURRENT_VERSION, applyMigrations } from './migrations'
import { getPersistenceActions } from './persistenceStore'
import { createConstraintsSlice, rebuildReverseIndex } from './slices/constraintsSlice'
import { createFloorsSlice } from './slices/floorsSlice'
import { updatePerimeterGeometry } from './slices/perimeterGeometry'
import { createPerimetersSlice } from './slices/perimeterSlice'
import { createRoofsSlice } from './slices/roofsSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import { createTimestampsSlice } from './slices/timestampsSlice'
import type { PartializedStoreState, Store, StoreActions, StoreState } from './types'

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
              getBounds: (storeyId: StoreyId): Bounds2D => {
                const { getPerimetersByStorey, getFloorAreasByStorey, getRoofsByStorey } = get().actions

                const perimeters = getPerimetersByStorey(storeyId)
                const floorAreas = getFloorAreasByStorey(storeyId)
                const roofs = getRoofsByStorey(storeyId)

                if (perimeters.length === 0 && floorAreas.length === 0) {
                  return Bounds2D.EMPTY
                }

                const perimeterPoints = perimeters.flatMap(p => p.outerPolygon.points)
                const floorAreaPoints = floorAreas.flatMap(area => area.area.points)
                const roofPoints = roofs.flatMap(roof => roof.overhangPolygon.points)
                const allPoints = [...perimeterPoints, ...floorAreaPoints, ...roofPoints]
                return Bounds2D.fromPoints(allPoints)
              },
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
        partialize: partializeState,
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
            regeneratePartializedState(state)

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

export const getInitialModelState = (): StoreState => {
  const state = useModelStore.getInitialState()
  return partializeState(state) as StoreState
}

function partializeState(state: Store): PartializedStoreState {
  const {
    actions: _actions,
    _perimeterGeometry,
    _perimeterWallGeometry,
    _perimeterCornerGeometry,
    _openingGeometry,
    _wallPostGeometry,
    _constraintsByEntity,
    ...rest
  } = state
  return rest
}

export function exportModelState() {
  return partializeState(useModelStore.getState())
}

function regeneratePartializedState(state: PartializedStoreState): void {
  const restoredState = state as StoreState
  restoredState._perimeterGeometry = {}
  restoredState._perimeterWallGeometry = {}
  restoredState._perimeterCornerGeometry = {}
  restoredState._openingGeometry = {}
  restoredState._wallPostGeometry = {}
  for (const perimeterId of Object.keys(restoredState.perimeters)) {
    updatePerimeterGeometry(restoredState, perimeterId as PerimeterId)
  }

  restoredState._constraintsByEntity = {}
  rebuildReverseIndex(restoredState)
}

export function hydrateModelState(state: PartializedStoreState, version: number): StoreState {
  const migratedState =
    version < CURRENT_VERSION ? (applyMigrations(state, version) as StoreState) : (state as StoreState)
  regeneratePartializedState(migratedState)
  useModelStore.setState(migratedState)
  return migratedState
}
