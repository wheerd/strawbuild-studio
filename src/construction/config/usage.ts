import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  StoreyId,
  WallAssemblyId
} from '@/building/model/ids'
import type { Perimeter, Roof, Storey } from '@/building/model/model'
import type { WallAssemblyConfig } from '@/construction/config/types'

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
  perimeters: Perimeter[],
  defaultBaseId?: RingBeamAssemblyId,
  defaultTopId?: RingBeamAssemblyId
): RingBeamAssemblyUsage {
  const storeyIdSet = new Set<StoreyId>()

  perimeters.forEach(perimeter => {
    perimeter.walls.forEach(wall => {
      if (wall.baseRingBeamAssemblyId === assemblyId || wall.topRingBeamAssemblyId === assemblyId) {
        storeyIdSet.add(perimeter.storeyId)
      }
    })
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
  perimeters: Perimeter[],
  defaultWallAssemblyId?: WallAssemblyId
): WallAssemblyUsage {
  const storeyIdSet = new Set<StoreyId>()

  perimeters.forEach(perimeter => {
    perimeter.walls.forEach(wall => {
      if (wall.wallAssemblyId === assemblyId) {
        storeyIdSet.add(perimeter.storeyId)
      }
    })
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
export function getOpeningAssemblyUsage(
  assemblyId: OpeningAssemblyId,
  perimeters: Perimeter[],
  wallAssemblies: WallAssemblyConfig[],
  defaultOpeningAssemblyId: OpeningAssemblyId
): OpeningAssemblyUsage {
  const isDefault = assemblyId === defaultOpeningAssemblyId
  const wallAssemblyIdSet = new Set<WallAssemblyId>()
  const storeyIdSet = new Set<StoreyId>()

  // Check wall assemblies that reference this opening assembly
  wallAssemblies.forEach(wallAssembly => {
    if (wallAssembly.openingAssemblyId === assemblyId) {
      wallAssemblyIdSet.add(wallAssembly.id)
    }
  })

  // Check individual openings that override to use this assembly
  perimeters.forEach(perimeter => {
    perimeter.walls.forEach(wall => {
      wall.openings.forEach(opening => {
        if (opening.openingAssemblyId === assemblyId) {
          storeyIdSet.add(perimeter.storeyId)
        }
      })
    })
  })

  return {
    isUsed: isDefault || wallAssemblyIdSet.size > 0 || storeyIdSet.size > 0,
    isDefault,
    wallAssemblyIds: Array.from(wallAssemblyIdSet),
    storeyIds: Array.from(storeyIdSet)
  }
}
