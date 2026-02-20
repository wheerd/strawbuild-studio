import { useMemo } from 'react'

import type { FloorAssemblyId, LayerSetId, RoofAssemblyId, WallAssemblyId } from '@/building/model/ids'
import { useFloorAssemblies, useRoofAssemblies, useWallAssemblies } from '@/construction/config/store'

export interface LayerSetUsage {
  isUsed: boolean
  wallAssemblyIds: WallAssemblyId[]
  floorAssemblyIds: FloorAssemblyId[]
  roofAssemblyIds: RoofAssemblyId[]
}

export function useLayerSetUsage(layerSetId: LayerSetId): LayerSetUsage {
  const wallAssemblies = useWallAssemblies()
  const floorAssemblies = useFloorAssemblies()
  const roofAssemblies = useRoofAssemblies()

  return useMemo(() => {
    const wallIds: WallAssemblyId[] = []
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
