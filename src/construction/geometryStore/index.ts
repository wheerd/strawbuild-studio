import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { type ConstructionModel } from '@/construction/model'

export interface CacheEntry {
  model: ConstructionModel | null
  cachedAt: number
}

export interface CacheResult {
  model: ConstructionModel | null
  isOutdated: boolean
}

export interface ConstructionGeometryActions {
  getWallCore: (wallId: PerimeterWallId) => CacheResult
  getRoofCore: (roofId: RoofId) => CacheResult
  getFloorCore: (perimeterId: PerimeterId) => CacheResult
  getRingBeamsCore: (perimeterId: PerimeterId) => CacheResult
  getStoreyFloorCore: (storeyId: StoreyId) => CacheResult

  getColinearWallGeometry: (wallId: PerimeterWallId) => CacheResult
  getPerimeterGeometry: (perimeterId: PerimeterId) => CacheResult
  getStoreyGeometry: (storeyId: StoreyId) => CacheResult
  getBuildingGeometry: () => CacheResult

  regenerateWallCore: (wallId: PerimeterWallId) => void
  regenerateRoofCore: (roofId: RoofId) => void
  regenerateFloorCore: (perimeterId: PerimeterId) => void
  regenerateRingBeamsCore: (perimeterId: PerimeterId) => void
  regenerateStoreyFloorCore: (storeyId: StoreyId) => void

  regenerateColinearWall: (wallId: PerimeterWallId) => void
  regeneratePerimeter: (perimeterId: PerimeterId) => void
  regenerateStorey: (storeyId: StoreyId) => void
  regenerateBuilding: () => void

  clearAll: () => void
  clearCore: () => void
  clearComposites: () => void
}

export interface ConstructionGeometryState {
  walls: Record<PerimeterWallId, CacheEntry>
  roofs: Record<string, CacheEntry>
  floors: Record<PerimeterId, CacheEntry>
  ringBeams: Record<PerimeterId, CacheEntry>
  storeyFloors: Record<StoreyId, CacheEntry>
  colinearWalls: Record<PerimeterWallId, CacheEntry>
  perimeters: Record<PerimeterId, CacheEntry>
  storeys: Record<StoreyId, CacheEntry>
  building: CacheEntry | null
}
