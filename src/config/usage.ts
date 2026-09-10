import { useMemo } from 'react'

import type { PerimeterWallWithGeometry, Roof, Storey } from '@/building/model'
import type {
  FloorAssemblyId,
  LayerSetId,
  OpeningAssemblyId,
  PerimeterWallAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  StoreyId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions, useFloorAssemblies, useRoofAssemblies, useWallAssemblies } from '@/config/store'

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
  wallAssemblyIds: PerimeterWallAssemblyId[]
  openingAssemblyIds: OpeningAssemblyId[]
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
  assemblyId: PerimeterWallAssemblyId,
  walls: PerimeterWallWithGeometry[],
  defaultWallAssemblyId?: PerimeterWallAssemblyId
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
  const { getDefaultOpeningAssemblyId, getAllPerimeterWallAssemblies, getAllOpeningAssemblies } = getConfigActions()
  const { getPerimeterById, getAllWallOpenings } = getModelActions()
  const wallAssemblies = getAllPerimeterWallAssemblies()
  const openingAssemblies = getAllOpeningAssemblies()
  const openings = getAllWallOpenings()

  const isDefault = assemblyId === getDefaultOpeningAssemblyId()
  const wallAssemblyIdSet = new Set<PerimeterWallAssemblyId>()
  const openingAssemblyIdSet = new Set<OpeningAssemblyId>()
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

  // Check threshold assemblies that reference this opening assembly
  openingAssemblies.forEach(openingAssembly => {
    if (openingAssembly.type === 'threshold') {
      if (openingAssembly.defaultId === assemblyId) {
        openingAssemblyIdSet.add(openingAssembly.id)
      } else if (openingAssembly.thresholds.some(threshold => threshold.assemblyId === assemblyId)) {
        openingAssemblyIdSet.add(openingAssembly.id)
      }
    }
  })

  return {
    isUsed: isDefault || wallAssemblyIdSet.size > 0 || storeyIdSet.size > 0 || openingAssemblyIdSet.size > 0,
    isDefault,
    wallAssemblyIds: Array.from(wallAssemblyIdSet),
    openingAssemblyIds: Array.from(openingAssemblyIdSet),
    storeyIds: Array.from(storeyIdSet)
  }
}

export interface LayerSetUsage {
  isUsed: boolean
  wallAssemblyIds: PerimeterWallAssemblyId[]
  floorAssemblyIds: FloorAssemblyId[]
  roofAssemblyIds: RoofAssemblyId[]
}

export function useLayerSetUsage(layerSetId: LayerSetId): LayerSetUsage {
  const wallAssemblies = useWallAssemblies()
  const floorAssemblies = useFloorAssemblies()
  const roofAssemblies = useRoofAssemblies()

  return useMemo(() => {
    const wallIds: PerimeterWallAssemblyId[] = []
    const floorIds: FloorAssemblyId[] = []
    const roofIds: RoofAssemblyId[] = []

    wallAssemblies.forEach(assembly => {
      if (assembly.insideLayerSetId === layerSetId || assembly.outsideLayerSetId === layerSetId) {
        wallIds.push(assembly.id)
      }
    })

    floorAssemblies.forEach(assembly => {
      if (assembly.topLayerSetId === layerSetId || assembly.bottomLayerSetId === layerSetId) {
        floorIds.push(assembly.id)
      }
    })

    roofAssemblies.forEach(assembly => {
      if (
        assembly.insideLayerSetId === layerSetId ||
        assembly.topLayerSetId === layerSetId ||
        assembly.overhangLayerSetId === layerSetId
      ) {
        roofIds.push(assembly.id)
      }
    })

    return {
      isUsed: wallIds.length > 0 || floorIds.length > 0 || roofIds.length > 0,
      wallAssemblyIds: wallIds,
      floorAssemblyIds: floorIds,
      roofAssemblyIds: roofIds
    }
  }, [layerSetId, wallAssemblies, floorAssemblies, roofAssemblies])
}
