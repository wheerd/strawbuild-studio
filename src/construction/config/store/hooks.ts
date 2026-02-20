import { useMemo } from 'react'

import type {
  FloorAssemblyId,
  LayerSetId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import type {
  FloorAssemblyConfig,
  OpeningAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import type { LayerSetConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'

import { useConfigStore } from './store'
import type { ConfigActions } from './types'

export const useDefaultStrawMaterialId = (): MaterialId => useConfigStore(state => state.defaultStrawMaterial)

export const useRingBeamAssemblies = (): RingBeamAssemblyConfig[] => {
  const ringBeamAssemblies = useConfigStore(state => state.ringBeamAssemblyConfigs)
  return useMemo(() => Object.values(ringBeamAssemblies), [ringBeamAssemblies])
}

export const useRingBeamAssemblyById = (id: RingBeamAssemblyId): RingBeamAssemblyConfig | null =>
  useConfigStore(state => state.actions.getRingBeamAssemblyById(id))

export const useDefaultBaseRingBeamAssemblyId = (): RingBeamAssemblyId | undefined =>
  useConfigStore(state => state.actions.getDefaultBaseRingBeamAssemblyId())

export const useDefaultTopRingBeamAssemblyId = (): RingBeamAssemblyId | undefined =>
  useConfigStore(state => state.actions.getDefaultTopRingBeamAssemblyId())

// Wall assembly selector hooks
export const useWallAssemblies = (): WallAssemblyConfig[] => {
  const wallAssemblies = useConfigStore(state => state.wallAssemblyConfigs)
  return useMemo(() => Object.values(wallAssemblies), [wallAssemblies])
}

export const useWallAssemblyById = (id: WallAssemblyId): WallAssemblyConfig | null =>
  useConfigStore(state => state.actions.getWallAssemblyById(id))

export const useDefaultWallAssemblyId = (): WallAssemblyId =>
  useConfigStore(state => state.actions.getDefaultWallAssemblyId())

// Floor construction config selector hooks
export const useFloorAssemblies = (): FloorAssemblyConfig[] => {
  const floorAssemblyConfigs = useConfigStore(state => state.floorAssemblyConfigs)
  return useMemo(() => Object.values(floorAssemblyConfigs), [floorAssemblyConfigs])
}

export const useFloorAssemblyById = (id: FloorAssemblyId): FloorAssemblyConfig | null =>
  useConfigStore(state => state.actions.getFloorAssemblyById(id))

export const useDefaultFloorAssemblyId = (): FloorAssemblyId =>
  useConfigStore(state => state.actions.getDefaultFloorAssemblyId())

// Roof assembly selector hooks
export const useRoofAssemblies = (): RoofAssemblyConfig[] => {
  const roofAssemblyConfigs = useConfigStore(state => state.roofAssemblyConfigs)
  return useMemo(() => Object.values(roofAssemblyConfigs), [roofAssemblyConfigs])
}

export const useRoofAssemblyById = (id: RoofAssemblyId): RoofAssemblyConfig | null =>
  useConfigStore(state => state.actions.getRoofAssemblyById(id))

export const useDefaultRoofAssemblyId = (): RoofAssemblyId =>
  useConfigStore(state => state.actions.getDefaultRoofAssemblyId())

// Opening assembly selector hooks
export const useOpeningAssemblies = (): OpeningAssemblyConfig[] => {
  const openingAssemblies = useConfigStore(state => state.openingAssemblyConfigs)
  return useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
}

export const useOpeningAssemblyById = (id: OpeningAssemblyId): OpeningAssemblyConfig | null =>
  useConfigStore(state => state.actions.getOpeningAssemblyById(id))

export const useDefaultOpeningAssemblyId = (): OpeningAssemblyId =>
  useConfigStore(state => state.actions.getDefaultOpeningAssemblyId())

// Layer set selector hooks
export const useLayerSets = (): LayerSetConfig[] => {
  const layerSetConfigs = useConfigStore(state => state.layerSetConfigs)
  return useMemo(() => Object.values(layerSetConfigs), [layerSetConfigs])
}

export const useLayerSetById = (id: LayerSetId): LayerSetConfig | null =>
  useConfigStore(state => state.actions.getLayerSetById(id))

export const useLayerSetsByUse = (use: LayerSetConfig['use']): LayerSetConfig[] =>
  useConfigStore(state => state.actions.getLayerSetsByUse(use))

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)
