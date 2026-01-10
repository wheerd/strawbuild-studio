import type { PerimeterWallWithGeometry, Roof, Storey } from '@/building/model'
import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  StoreyId,
  WallAssemblyId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'

export interface RingBeamAssemblyUsage {
  isUsed: boolean
  isDefaultBase: boolean
  isDefaultTop: boolean
  storeyIds: StoreyId[]
}

export interface WallAssemblyUsage {
  isUsed: boolean
  isDefault: boolean
  storeyIds: StoreyId[]
}

export interface FloorAssemblyUsage {
  isUsed: boolean
  isDefault: boolean
  storeyIds: StoreyId[]
}

export interface RoofAssemblyUsage {
  isUsed: boolean
  isDefault: boolean
  storeyIds: StoreyId[]
}

export interface OpeningAssemblyUsage {
  isUsed: boolean
  isDefault: boolean
  wallAssemblyIds: WallAssemblyId[]
  storeyIds: StoreyId[]
}

/**
 * Checks if a ring beam assembly is currently in use by any perimeters
 */
export function getRingBeamAssemblyUsage(
  assemblyId: RingBeamAssemblyId,
  walls: PerimeterWallWithGeometry[],
  defaultBaseId?: RingBeamAssemblyId,
  defaultTopId?: RingBeamAssemblyId
): RingBeamAssemblyUsage {
  const { getPerimeterById } = getModelActions()
  const storeyIdSet = new Set<StoreyId>()

  walls.forEach(wall => {
    if (wall.baseRingBeamAssemblyId === assemblyId || wall.topRingBeamAssemblyId === assemblyId) {
      storeyIdSet.add(getPerimeterById(wall.perimeterId).storeyId)
    }
  })

  const isDefaultBase = assemblyId === defaultBaseId
  const isDefaultTop = assemblyId === defaultTopId

  return {
    isUsed: storeyIdSet.size > 0 || isDefaultBase || isDefaultTop,
    isDefaultBase,
    isDefaultTop,
    storeyIds: Array.from(storeyIdSet)
  }
}

/**
 * Checks if a wall assembly is currently in use by any walls
 */
export function getWallAssemblyUsage(
  assemblyId: WallAssemblyId,
  walls: PerimeterWallWithGeometry[],
  defaultWallAssemblyId?: WallAssemblyId
): WallAssemblyUsage {
  const { getPerimeterById } = getModelActions()
  const storeyIdSet = new Set<StoreyId>()

  walls.forEach(wall => {
    if (wall.wallAssemblyId === assemblyId) {
      storeyIdSet.add(getPerimeterById(wall.perimeterId).storeyId)
    }
  })

  const isDefault = assemblyId === defaultWallAssemblyId

  return {
    isUsed: storeyIdSet.size > 0 || isDefault,
    isDefault,
    storeyIds: Array.from(storeyIdSet)
  }
}

/**
 * Checks if a floor assembly is currently in use by any storeys
 */
export function getFloorAssemblyUsage(
  assemblyId: FloorAssemblyId,
  storeys: Storey[],
  defaultFloorAssemblyId?: FloorAssemblyId
): FloorAssemblyUsage {
  const storeyIdSet = new Set<StoreyId>()

  storeys.forEach(storey => {
    if (storey.floorAssemblyId === assemblyId) {
      storeyIdSet.add(storey.id)
    }
  })

  const isDefault = assemblyId === defaultFloorAssemblyId

  return {
    isUsed: storeyIdSet.size > 0 || isDefault,
    isDefault,
    storeyIds: Array.from(storeyIdSet)
  }
}

/**
 * Checks if a roof assembly is currently in use by any roofs
 */
export function getRoofAssemblyUsage(
  assemblyId: RoofAssemblyId,
  roofs: Roof[],
  defaultRoofAssemblyId?: RoofAssemblyId
): RoofAssemblyUsage {
  const storeyIdSet = new Set<StoreyId>()

  roofs.forEach(roof => {
    if (roof.assemblyId === assemblyId) {
      storeyIdSet.add(roof.storeyId)
    }
  })

  const isDefault = assemblyId === defaultRoofAssemblyId

  return {
    isUsed: storeyIdSet.size > 0 || isDefault,
    isDefault,
    storeyIds: Array.from(storeyIdSet)
  }
}

/**
 * Checks if an opening assembly is currently in use by:
 * - As the global default
 * - As a default in any wall assemblies
 * - By individual openings that override to use this assembly
 */
export function getOpeningAssemblyUsage(assemblyId: OpeningAssemblyId): OpeningAssemblyUsage {
  const { getDefaultOpeningAssemblyId, getAllWallAssemblies } = getConfigActions()
  const { getPerimeterById, getAllWallOpenings } = getModelActions()
  const wallAssemblies = getAllWallAssemblies()
  const openings = getAllWallOpenings()

  const isDefault = assemblyId === getDefaultOpeningAssemblyId()
  const wallAssemblyIdSet = new Set<WallAssemblyId>()
  const storeyIdSet = new Set<StoreyId>()

  // Check wall assemblies that reference this opening assembly
  wallAssemblies.forEach(wallAssembly => {
    if (wallAssembly.openingAssemblyId === assemblyId) {
      wallAssemblyIdSet.add(wallAssembly.id)
    }
  })

  // Check individual openings that override to use this assembly
  openings.forEach(opening => {
    if (opening.openingAssemblyId === assemblyId) {
      storeyIdSet.add(getPerimeterById(opening.perimeterId).storeyId)
    }
  })

  return {
    isUsed: isDefault || wallAssemblyIdSet.size > 0 || storeyIdSet.size > 0,
    isDefault,
    wallAssemblyIds: Array.from(wallAssemblyIdSet),
    storeyIds: Array.from(storeyIdSet)
  }
}
