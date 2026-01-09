import isDeepEqual from 'fast-deep-equal'
import { useCallback, useMemo } from 'react'
import { debounce } from 'throttle-debounce'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type {
  FloorArea,
  FloorOpening,
  OpeningWithGeometry,
  PerimeterCornerWithGeometry,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry,
  Roof,
  Storey,
  WallPostWithGeometry
} from '@/building/model'
import {
  type FloorAreaId,
  type FloorOpeningId,
  type OpeningId,
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type RoofId,
  type SelectableId,
  type StoreyId,
  type WallPostId,
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId,
  isWallPostId
} from '@/building/model/ids'

import { CURRENT_VERSION, applyMigrations } from './migrations'
import { getPersistenceActions } from './persistenceStore'
import { createFloorsSlice } from './slices/floorsSlice'
import { createPerimetersSlice } from './slices/perimeterSlice'
import { createRoofsSlice } from './slices/roofsSlice'
import { createStoreysSlice } from './slices/storeysSlice'
import type { Store, StoreActions, StoreState } from './types'

// Custom debounced save with immediate isSaving feedback
let saveTimeout: NodeJS.Timeout | null = null

const createDebouncedSave = () => {
  return (name: string, value: unknown) => {
    const persistenceActions = getPersistenceActions()

    // Set saving immediately
    persistenceActions.setSaving(true)

    // Clear existing timeout
    if (saveTimeout) clearTimeout(saveTimeout)

    // Schedule actual save
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(name, JSON.stringify(value))
        persistenceActions.setSaveSuccess(new Date())
      } catch (error) {
        persistenceActions.setSaveError(error instanceof Error ? error.message : 'Save failed')
      }
    }, 1000)
  }
}

// Create the main store with persistence, undo/redo, and slices
const useModelStore = create<Store>()(
  persist(
    temporal(
      (set, get, store) => {
        const storeysSlice = immer(createStoreysSlice)(set, get, store)
        const perimetersSlice = immer(createPerimetersSlice)(set, get, store)
        const floorsSlice = immer(createFloorsSlice)(set, get, store)
        const roofsSlice = immer(createRoofsSlice)(set, get, store)

        return {
          ...storeysSlice,
          ...perimetersSlice,
          ...floorsSlice,
          ...roofsSlice,
          actions: {
            ...storeysSlice.actions,
            ...perimetersSlice.actions,
            ...floorsSlice.actions,
            ...roofsSlice.actions,
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
        handleSet: set => debounce(500, set, { atBegin: false })
      }
    ),
    {
      // Persistence configuration
      name: 'strawbaler-model',
      version: CURRENT_VERSION,
      migrate: (persistedState: unknown) => applyMigrations(persistedState) as StoreState,
      partialize: state => Object.fromEntries(Object.entries(state).filter(([k]) => k !== 'actions')),
      storage: {
        getItem: name => {
          const item = localStorage.getItem(name)
          return item ? JSON.parse(item) : null
        },
        setItem: createDebouncedSave(),
        removeItem: name => localStorage.removeItem(name)
      },
      onRehydrateStorage: () => state => {
        if (state) {
          const persistenceActions = getPersistenceActions()
          persistenceActions.setHydrated(true)
        }
      }
    }
  )
)

// Undo/redo hooks
export const useUndo = (): (() => void) => useModelStore.temporal.getState().undo
export const useRedo = (): (() => void) => useModelStore.temporal.getState().redo
export const useCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const useCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

// Entity selector hooks
export const useActiveStoreyId = (): StoreyId => useModelStore(state => state.activeStoreyId)
export const useStoreyById = (id: StoreyId): Storey | null => {
  const storeys = useModelStore(state => state.storeys)
  const getStoreyById = useModelStore(state => state.actions.getStoreyById)
  return useMemo(() => getStoreyById(id), [storeys, id])
}
export const useStoreysOrderedByLevel = (): Storey[] => {
  const storeys = useModelStore(state => state.storeys)
  const getStoreysOrderedByLevel = useModelStore(state => state.actions.getStoreysOrderedByLevel)
  return useMemo(() => getStoreysOrderedByLevel(), [storeys])
}

export const useModelEntityById = (
  id: SelectableId | null,
  parentId?: SelectableId
):
  | PerimeterWithGeometry
  | PerimeterWallWithGeometry
  | PerimeterCornerWithGeometry
  | OpeningWithGeometry
  | WallPostWithGeometry
  | FloorArea
  | FloorOpening
  | Roof
  | null => {
  const selector = useCallback(
    (state: Store) => {
      if (id == null) return null
      if (isOpeningId(id)) return state.openings[id]
      if (isWallPostId(id)) return state.wallPosts[id]
      if (isPerimeterId(id)) return state.perimeters[id]
      if (isPerimeterWallId(id)) return state.perimeterWalls[id]
      if (isPerimeterCornerId(id)) return state.perimeterCorners[id]
      if (isFloorAreaId(id)) return state.floorAreas[id]
      if (isFloorOpeningId(id)) return state.floorOpenings[id]
      if (isRoofId(id)) return state.roofs[id]
      if (isRoofOverhangId(id)) return state.roofs[parentId as RoofId]
      return state
    },
    [id, parentId]
  )
  const geometrySelector = useCallback(
    (state: Store) => {
      if (id == null) return null
      if (isOpeningId(id)) return state._openingGeometry[id]
      if (isWallPostId(id)) return state._wallPostGeometry[id]
      if (isPerimeterId(id)) return state._perimeterGeometry[id]
      if (isPerimeterWallId(id)) return state._perimeterWallGeometry[id]
      if (isPerimeterCornerId(id)) return state._perimeterCornerGeometry[id]
      if (isRoofOverhangId(id)) return state.roofs[parentId as RoofId]
      return state
    },
    [id, parentId]
  )
  const getterSelector = useCallback(
    (state: Store) => {
      if (id == null) return () => null
      if (isOpeningId(id)) return state.actions.getWallOpeningById
      if (isWallPostId(id)) return state.actions.getWallPostById
      if (isPerimeterId(id)) return state.actions.getPerimeterById
      if (isPerimeterWallId(id)) return state.actions.getPerimeterWallById
      if (isPerimeterCornerId(id)) return state.actions.getPerimeterCornerById
      if (isFloorAreaId(id)) return state.actions.getFloorAreaById
      if (isFloorOpeningId(id)) return state.actions.getFloorOpeningById
      if (isRoofId(id)) return state.actions.getRoofById
      if (isRoofOverhangId(id)) return state.actions.getRoofById
      return () => null
    },
    [id]
  )
  const entity = useModelStore(selector)
  const geometry = useModelStore(geometrySelector)
  const getter = useModelStore(getterSelector)
  return useMemo(() => {
    if (id == null) return null
    if (isRoofOverhangId(id)) {
      const roof = getter(parentId as RoofId) as Roof | null
      return roof?.overhangs.find(o => o.id === id) ?? null
    }
    return getter(id as any)
  }, [entity, geometry, getter, id, parentId])
}

export const usePerimeters = (): PerimeterWithGeometry[] => {
  const perimeters = useModelStore(state => state.perimeters)
  const geometries = useModelStore(state => state._perimeterGeometry)
  const getAllPerimeters = useModelStore(state => state.actions.getAllPerimeters)
  return useMemo(() => getAllPerimeters(), [perimeters, geometries])
}
export const usePerimeterById = (id: PerimeterId): PerimeterWithGeometry => {
  const perimeters = useModelStore(state => state.perimeters[id])
  const geometry = useModelStore(state => state._perimeterGeometry[id])
  const getPerimeterById = useModelStore(state => state.actions.getPerimeterById)
  return useMemo(() => getPerimeterById(id), [perimeters, geometry])
}
export const usePerimetersOfActiveStorey = (): PerimeterWithGeometry[] => {
  const activeStoreyId = useActiveStoreyId()
  const perimeters = useModelStore(state => state.perimeters)
  const geometries = useModelStore(state => state._perimeterGeometry)
  const getPerimetersByStorey = useModelStore(state => state.actions.getPerimetersByStorey)
  return useMemo(() => getPerimetersByStorey(activeStoreyId), [perimeters, geometries, activeStoreyId])
}
export const useWallPosts = (): WallPostWithGeometry[] => {
  const wallPosts = useModelStore(state => state.wallPosts)
  const geometries = useModelStore(state => state._wallPostGeometry)
  const getAllWallPosts = useModelStore(state => state.actions.getAllWallPosts)
  return useMemo(() => getAllWallPosts(), [wallPosts, geometries])
}
export const useWallOpenings = (): OpeningWithGeometry[] => {
  const openings = useModelStore(state => state.openings)
  const geometries = useModelStore(state => state._openingGeometry)
  const getAllWallOpenings = useModelStore(state => state.actions.getAllWallOpenings)
  return useMemo(() => getAllWallOpenings(), [openings, geometries])
}
export const usePerimeterCornerById = (id: PerimeterCornerId): PerimeterCornerWithGeometry => {
  const corner = useModelStore(state => state.perimeterCorners[id])
  const geometry = useModelStore(state => state._perimeterCornerGeometry[id])
  const getPerimeterCornerById = useModelStore(state => state.actions.getPerimeterCornerById)
  return useMemo(() => getPerimeterCornerById(id), [corner, geometry])
}
export const usePerimeterWallById = (id: PerimeterWallId): PerimeterWallWithGeometry => {
  const wall = useModelStore(state => state.perimeterWalls[id])
  const geometry = useModelStore(state => state._perimeterWallGeometry[id])
  const getPerimeterWallById = useModelStore(state => state.actions.getPerimeterWallById)
  return useMemo(() => getPerimeterWallById(id), [wall, geometry])
}
export const useWallOpeningById = (id: OpeningId): OpeningWithGeometry => {
  const opening = useModelStore(state => state.openings[id])
  const geometry = useModelStore(state => state._openingGeometry[id])
  const getWallOpeningById = useModelStore(state => state.actions.getWallOpeningById)
  return useMemo(() => getWallOpeningById(id), [opening, geometry])
}
export const useWallPostById = (id: WallPostId): WallPostWithGeometry => {
  const post = useModelStore(state => state.wallPosts[id])
  const geometry = useModelStore(state => state._wallPostGeometry[id])
  const getWallPostById = useModelStore(state => state.actions.getWallPostById)
  return useMemo(() => getWallPostById(id), [post, geometry])
}

export const useFloorAreas = (): Record<FloorAreaId, FloorArea> => useModelStore(state => state.floorAreas)
export const useFloorOpenings = (): Record<FloorOpeningId, FloorOpening> => useModelStore(state => state.floorOpenings)

export const useFloorAreaById = (id: FloorAreaId): FloorArea | null => {
  const floorAreas = useModelStore(state => state.floorAreas)
  const getFloorAreaById = useModelStore(state => state.actions.getFloorAreaById)
  return useMemo(() => getFloorAreaById(id), [floorAreas, id])
}

export const useFloorOpeningById = (id: FloorOpeningId): FloorOpening | null => {
  const floorOpenings = useModelStore(state => state.floorOpenings)
  const getFloorOpeningById = useModelStore(state => state.actions.getFloorOpeningById)
  return useMemo(() => getFloorOpeningById(id), [floorOpenings, id])
}

export const useFloorAreasOfActiveStorey = (): FloorArea[] => {
  const activeStoreyId = useActiveStoreyId()
  const floorAreas = useModelStore(state => state.floorAreas)
  const getFloorAreasByStorey = useModelStore(state => state.actions.getFloorAreasByStorey)
  return useMemo(() => getFloorAreasByStorey(activeStoreyId), [floorAreas, activeStoreyId])
}

export const useFloorOpeningsOfActiveStorey = (): FloorOpening[] => {
  const activeStoreyId = useActiveStoreyId()
  const floorOpenings = useModelStore(state => state.floorOpenings)
  const getFloorOpeningsByStorey = useModelStore(state => state.actions.getFloorOpeningsByStorey)
  return useMemo(() => getFloorOpeningsByStorey(activeStoreyId), [floorOpenings, activeStoreyId])
}

export const useRoofs = (): Record<RoofId, Roof> => useModelStore(state => state.roofs)

export const useRoofById = (id: RoofId): Roof | null => {
  const roofs = useModelStore(state => state.roofs)
  const getRoofById = useModelStore(state => state.actions.getRoofById)
  return useMemo(() => getRoofById(id), [roofs, id])
}

export const useRoofsOfActiveStorey = (): Roof[] => {
  const activeStoreyId = useActiveStoreyId()
  const roofs = useModelStore(state => state.roofs)
  const getRoofsByStorey = useModelStore(state => state.actions.getRoofsByStorey)
  return useMemo(() => getRoofsByStorey(activeStoreyId), [roofs, activeStoreyId])
}

export const useModelActions = (): StoreActions => useModelStore(state => state.actions)

// Non-reactive actions-only accessor for tools and services
export const getModelActions = (): StoreActions => useModelStore.getState().actions

// Non-reactive undo/redo functions for direct access (not hooks)
export const getUndoFunction = (): (() => void) => useModelStore.temporal.getState().undo
export const getRedoFunction = (): (() => void) => useModelStore.temporal.getState().redo
export const getCanUndo = (): boolean => useModelStore.temporal.getState().pastStates.length > 0
export const getCanRedo = (): boolean => useModelStore.temporal.getState().futureStates.length > 0

// Non-reactive persistence functions for direct access
export const clearPersistence = (): void => {
  localStorage.removeItem('strawbaler-model')
}

// Export types
export type { StoreActions } from './types'
