import { useMemo } from 'react'

import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import { useWallPosts } from '@/building/store'
import {
  useDefaultStrawMaterialId,
  useFloorAssemblies,
  useOpeningAssemblies,
  useRingBeamAssemblies,
  useRoofAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import type {
  FloorAssemblyConfig,
  OpeningAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import type { LayerConfig } from '@/construction/layers/types'
import { assertUnreachable } from '@/shared/utils'

import type { MaterialId } from './material'

export type MaterialUsageId = RingBeamAssemblyId | WallAssemblyId | FloorAssemblyId | RoofAssemblyId | OpeningAssemblyId

export interface MaterialUsage {
  isUsed: boolean
  isDefaultStraw: boolean
  assemblyIds: MaterialUsageId[]
  usedInWallPosts: boolean
}

/**
 * React hook that checks if a material is currently in use by any construction configurations
 */
export function useMaterialUsage(materialId: MaterialId): MaterialUsage {
  // Get all data from stores
  const ringBeamAssemblies = useRingBeamAssemblies()
  const wallAssemblies = useWallAssemblies()
  const floorAssemblies = useFloorAssemblies()
  const roofAssemblies = useRoofAssemblies()
  const openingAssemblies = useOpeningAssemblies()
  const defaultStrawMaterialId = useDefaultStrawMaterialId()
  const wallPosts = useWallPosts()

  return useMemo(() => {
    const assemblyIdSet = new Set<MaterialUsageId>()
    let usedInWallPosts = false

    // Check ring beam assemblies
    ringBeamAssemblies.forEach(assembly => {
      if (isMaterialUsedInRingBeam(materialId, assembly)) {
        assemblyIdSet.add(assembly.id)
      }
    })

    // Check wall assemblies
    wallAssemblies.forEach(assembly => {
      if (isMaterialUsedInWall(materialId, assembly)) {
        assemblyIdSet.add(assembly.id)
      }
    })

    // Check floor assemblies
    floorAssemblies.forEach(assembly => {
      if (isMaterialUsedInFloor(materialId, assembly)) {
        assemblyIdSet.add(assembly.id)
      }
    })

    // Check roof assemblies
    roofAssemblies.forEach(assembly => {
      if (isMaterialUsedInRoof(materialId, assembly)) {
        assemblyIdSet.add(assembly.id)
      }
    })

    // Check opening assemblies
    openingAssemblies.forEach(assembly => {
      if (isMaterialUsedInOpening(materialId, assembly)) {
        assemblyIdSet.add(assembly.id)
      }
    })

    // Check wall posts from building model

    for (const post of wallPosts) {
      if (post.material === materialId || post.infillMaterial === materialId) {
        usedInWallPosts = true
        break
      }
    }

    const isDefaultStraw = defaultStrawMaterialId === materialId

    return {
      isUsed: assemblyIdSet.size > 0 || usedInWallPosts || isDefaultStraw,
      isDefaultStraw,
      assemblyIds: Array.from(assemblyIdSet),
      usedInWallPosts
    }
  }, [
    materialId,
    ringBeamAssemblies,
    wallAssemblies,
    floorAssemblies,
    roofAssemblies,
    openingAssemblies,
    defaultStrawMaterialId,
    wallPosts
  ])
}

// Helper functions to check if material is used in each assembly type

function isMaterialUsedInRingBeam(materialId: MaterialId, assembly: RingBeamAssemblyConfig): boolean {
  switch (assembly.type) {
    case 'full':
    case 'double':
      if (assembly.material === materialId) return true
      if (assembly.type === 'double' && assembly.infillMaterial === materialId) return true
      break

    case 'brick':
      if (assembly.wallMaterial === materialId) return true
      if (assembly.beamMaterial === materialId) return true
      if (assembly.waterproofingMaterial === materialId) return true
      if (assembly.insulationMaterial === materialId) return true
      break
  }

  return false
}

function isMaterialUsedInWall(materialId: MaterialId, assembly: WallAssemblyConfig): boolean {
  switch (assembly.type) {
    case 'infill':
      if (assembly.posts.material === materialId) return true
      if ('infillMaterial' in assembly.posts && assembly.posts.infillMaterial === materialId) return true
      if (assembly.strawMaterial === materialId) return true
      if (assembly.infillMaterial === materialId) return true
      if (assembly.triangularBattens.material === materialId) return true
      break

    case 'strawhenge':
    case 'modules':
      if (assembly.module.frameMaterial === materialId) return true
      if (assembly.module.strawMaterial === materialId) return true
      if (assembly.module.triangularBattens.material === materialId) return true
      if (assembly.module.type === 'double') {
        if (assembly.module.spacerMaterial === materialId) return true
        if (assembly.module.infillMaterial === materialId) return true
      }
      if (assembly.infill.posts.material === materialId) return true
      if (assembly.infill.strawMaterial === materialId) return true
      if (assembly.infill.infillMaterial === materialId) return true
      if (assembly.infill.triangularBattens.material === materialId) return true
      break

    case 'non-strawbale':
      if (assembly.material === materialId) return true
      break
  }

  // Check layers
  if (checkLayers(assembly.layers.insideLayers, materialId)) return true
  if (checkLayers(assembly.layers.outsideLayers, materialId)) return true

  return false
}

function isMaterialUsedInFloor(materialId: MaterialId, assembly: FloorAssemblyConfig): boolean {
  switch (assembly.type) {
    case 'monolithic':
      if (assembly.material === materialId) return true
      break

    case 'joist':
      if (assembly.joistMaterial === materialId) return true
      if (assembly.wallBeamMaterial === materialId) return true
      if (assembly.wallInfillMaterial === materialId) return true
      if (assembly.subfloorMaterial === materialId) return true
      if (assembly.openingSideMaterial === materialId) return true
      break

    case 'filled':
      if (assembly.joistMaterial === materialId) return true
      if (assembly.frameMaterial === materialId) return true
      if (assembly.subfloorMaterial === materialId) return true
      if (assembly.ceilingSheathingMaterial === materialId) return true
      if (assembly.openingFrameMaterial === materialId) return true
      if (assembly.strawMaterial === materialId) return true
      break
  }

  // Check layers
  if (checkLayers(assembly.layers.topLayers, materialId)) return true
  if (checkLayers(assembly.layers.bottomLayers, materialId)) return true

  return false
}

function isMaterialUsedInRoof(materialId: MaterialId, assembly: RoofAssemblyConfig): boolean {
  switch (assembly.type) {
    case 'monolithic':
      if (assembly.material === materialId) return true
      if (assembly.infillMaterial === materialId) return true
      break

    case 'purlin':
      if (assembly.purlinMaterial === materialId) return true
      if (assembly.infillMaterial === materialId) return true
      if (assembly.rafterMaterial === materialId) return true
      if (assembly.ceilingSheathingMaterial === materialId) return true
      if (assembly.deckingMaterial === materialId) return true
      if (assembly.strawMaterial === materialId) return true
      break
  }

  // Check layers
  if (checkLayers(assembly.layers.insideLayers, materialId)) return true
  if (checkLayers(assembly.layers.topLayers, materialId)) return true
  if (checkLayers(assembly.layers.overhangLayers, materialId)) return true

  return false
}

function isMaterialUsedInOpening(materialId: MaterialId, assembly: OpeningAssemblyConfig): boolean {
  if (assembly.type !== 'empty') {
    if (assembly.headerMaterial === materialId) return true
    if (assembly.sillMaterial === materialId) return true
  }

  if (assembly.type === 'post') {
    if (assembly.posts.material === materialId) return true
    if (assembly.posts.type === 'double' && assembly.posts.infillMaterial === materialId) return true
  }

  if (assembly.type === 'planked') {
    if (assembly.plankMaterial === materialId) return true
  }

  return false
}

function checkLayers(layers: LayerConfig[], materialId: MaterialId): boolean {
  for (const layer of layers) {
    switch (layer.type) {
      case 'monolithic':
        if (layer.material === materialId) return true
        break
      case 'striped':
        if (layer.stripeMaterial === materialId) return true
        if (layer.gapMaterial === materialId) return true
        break
      default:
        assertUnreachable(layer, 'Invalid layer type')
    }
  }
  return false
}
