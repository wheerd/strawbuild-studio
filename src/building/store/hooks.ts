import { useCallback, useMemo } from 'react'

import type {
  Constraint,
  FloorArea,
  FloorOpening,
  OpeningWithGeometry,
  PerimeterCornerGeometry,
  PerimeterCornerWithGeometry,
  PerimeterWallWithGeometry,
  PerimeterWithGeometry,
  Roof,
  RoofOverhang,
  Storey,
  WallPostWithGeometry
} from '@/building/model'
import {
  type ConstraintEntityId,
  type ConstraintId,
  type FloorAreaId,
  type FloorOpeningId,
  type OpeningId,
  type PerimeterCornerId,
  type PerimeterId,
  type PerimeterWallId,
  type RoofId,
  type RoofOverhangId,
  type SelectableId,
  type StoreyId,
  type WallPostId,
  isConstraintId,
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
import { assertUnreachable } from '@/shared/utils'

import { useModelStore } from './store'
import type { Store, StoreActions } from './types'

export { InvalidOperationError, NotFoundError } from './errors'

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

const nullGetter = () => null
const emptyGeometry = {}

export const useModelEntityById = (
  id: SelectableId | null
):
  | Constraint
  | PerimeterWithGeometry
  | PerimeterWallWithGeometry
  | PerimeterCornerWithGeometry
  | OpeningWithGeometry
  | WallPostWithGeometry
  | FloorArea
  | FloorOpening
  | Roof
  | RoofOverhang
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
      if (isRoofOverhangId(id)) return state.roofOverhangs[id]
      if (isConstraintId(id)) return state.buildingConstraints[id] ?? null
      assertUnreachable(id, `Unsupported entity: ${id}`)
    },
    [id]
  )
  const geometrySelector = useCallback(
    (state: Store) => {
      if (id == null) return null
      if (isOpeningId(id)) return state._openingGeometry[id]
      if (isWallPostId(id)) return state._wallPostGeometry[id]
      if (isPerimeterId(id)) return state._perimeterGeometry[id]
      if (isPerimeterWallId(id)) return state._perimeterWallGeometry[id]
      if (isPerimeterCornerId(id)) return state._perimeterCornerGeometry[id]
      if (isRoofOverhangId(id)) return state.roofOverhangs[id]
      return emptyGeometry
    },
    [id]
  )
  const getterSelector = useCallback(
    (state: Store) => {
      if (id == null) return nullGetter
      if (isOpeningId(id)) return state.actions.getWallOpeningById
      if (isWallPostId(id)) return state.actions.getWallPostById
      if (isPerimeterId(id)) return state.actions.getPerimeterById
      if (isPerimeterWallId(id)) return state.actions.getPerimeterWallById
      if (isPerimeterCornerId(id)) return state.actions.getPerimeterCornerById
      if (isFloorAreaId(id)) return state.actions.getFloorAreaById
      if (isFloorOpeningId(id)) return state.actions.getFloorOpeningById
      if (isRoofId(id)) return state.actions.getRoofById
      if (isRoofOverhangId(id)) return state.actions.getRoofOverhangById
      if (isConstraintId(id)) return state.actions.getBuildingConstraintById
      assertUnreachable(id, `Unsupported entity: ${id}`)
    },
    [id]
  )
  const entity = useModelStore(selector)
  const geometry = useModelStore(geometrySelector)
  const getter = useModelStore(getterSelector)
  return useMemo(() => {
    if (id == null) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    return getter(id as any)
  }, [entity, geometry, getter, id])
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
export const usePerimeterWalls = (): PerimeterWallWithGeometry[] => {
  const walls = useModelStore(state => state.perimeterWalls)
  const geometries = useModelStore(state => state._perimeterWallGeometry)
  const getAllPerimeterWalls = useModelStore(state => state.actions.getAllPerimeterWalls)
  return useMemo(() => getAllPerimeterWalls(), [walls, geometries])
}
export const usePerimeterWallsById = (id: PerimeterId): PerimeterWallWithGeometry[] => {
  const perimeter = useModelStore(state => state.perimeters[id])
  const walls = useModelStore(state => state.perimeterWalls)
  const geometries = useModelStore(state => state._perimeterWallGeometry)
  const getPerimeterWallsById = useModelStore(state => state.actions.getPerimeterWallsById)
  return useMemo(() => getPerimeterWallsById(id), [perimeter, walls, geometries, id])
}
export const usePerimeterCornersById = (id: PerimeterId): PerimeterCornerWithGeometry[] => {
  const perimeter = useModelStore(state => state.perimeters[id])
  const walls = useModelStore(state => state.perimeterCorners)
  const geometries = useModelStore(state => state._perimeterCornerGeometry)
  const getPerimeterCornersById = useModelStore(state => state.actions.getPerimeterCornersById)
  return useMemo(() => getPerimeterCornersById(id), [perimeter, walls, geometries, id])
}
export const useWallOpeningsById = (id: PerimeterWallId): OpeningWithGeometry[] => {
  const wall = useModelStore(state => state.perimeterWalls[id])
  const openings = useModelStore(state => state.openings)
  const geometries = useModelStore(state => state._openingGeometry)
  const getWallOpeningsById = useModelStore(state => state.actions.getWallOpeningsById)
  return useMemo(() => getWallOpeningsById(id), [wall, openings, geometries, id])
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

export const useRoofOverhangs = (): Record<RoofOverhangId, RoofOverhang> => useModelStore(state => state.roofOverhangs)

export const useRoofOverhangById = (id: RoofOverhangId): RoofOverhang | null => {
  const overhangs = useModelStore(state => state.roofOverhangs)
  const getRoofOverhangById = useModelStore(state => state.actions.getRoofOverhangById)
  return useMemo(() => getRoofOverhangById(id), [overhangs, id])
}

export const useRoofOverhangsByRoof = (roofId: RoofId): RoofOverhang[] => {
  const overhangs = useModelStore(state => state.roofOverhangs)
  const roofs = useModelStore(state => state.roofs)
  const getRoofOverhangsByRoof = useModelStore(state => state.actions.getRoofOverhangsByRoof)
  return useMemo(() => getRoofOverhangsByRoof(roofId), [overhangs, roofs, roofId])
}

export const useBuildingConstraints = (): Record<ConstraintId, Constraint> =>
  useModelStore(state => state.buildingConstraints)

export const useConstraintsForEntity = (entityId: ConstraintEntityId): Constraint[] => {
  const buildingConstraints = useModelStore(state => state.buildingConstraints)
  const reverseIndex = useModelStore(state => state._constraintsByEntity)
  const getConstraintsForEntity = useModelStore(state => state.actions.getConstraintsForEntity)
  return useMemo(() => getConstraintsForEntity(entityId), [buildingConstraints, reverseIndex, entityId])
}

export const usePerimeterCornerGeometries = (): Record<PerimeterCornerId, PerimeterCornerGeometry> =>
  useModelStore(state => state._perimeterCornerGeometry)

export const useModelActions = (): StoreActions => useModelStore(state => state.actions)
