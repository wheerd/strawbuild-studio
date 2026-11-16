import { useMemo } from 'react'

import type {
  FloorAssemblyId,
  InteriorWallAssemblyId,
  LayerSetId,
  OpeningAssemblyId,
  PerimeterWallAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId
} from '@/building/model/ids'
import type {
  FloorAssemblyConfig,
  InteriorWallAssemblyConfig,
  OpeningAssemblyConfig,
  PerimeterWallAssemblyConfig,
  RingBeamAssemblyConfig,
  RoofAssemblyConfig
} from '@/config/types'
import type { LayerSetConfig } from '@/construction/assemblies/layers/types'
import type { MaterialId } from '@/materials/types'

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
export const useWallAssemblies = (): PerimeterWallAssemblyConfig[] => {
  const wallAssemblies = useConfigStore(state => state.perimeterWallAssemblyConfigs)
  return useMemo(() => Object.values(wallAssemblies), [wallAssemblies])
}

export const useWallAssemblyById = (id: PerimeterWallAssemblyId): PerimeterWallAssemblyConfig | null =>
  useConfigStore(state => state.actions.getPerimeterWallAssemblyById(id))

export const useDefaultWallAssemblyId = (): PerimeterWallAssemblyId =>
  useConfigStore(state => state.actions.getDefaultPerimeterWallAssemblyId())

export const useInteriorWallAssemblies = (): InteriorWallAssemblyConfig[] => {
  const assemblies = useConfigStore(state => state.interiorWallAssemblyConfigs)
  return useMemo(() => Object.values(assemblies), [assemblies])
}

export const useInteriorWallAssemblyById = (id: InteriorWallAssemblyId): InteriorWallAssemblyConfig | null =>
  useConfigStore(state => state.actions.getInteriorWallAssemblyById(id))

export const useDefaultInteriorWallAssemblyId = (): InteriorWallAssemblyId =>
  useConfigStore(state => state.actions.getDefaultInteriorWallAssemblyId())

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

export const useLayerSetById = (id: LayerSetId | undefined): LayerSetConfig | null =>
  useConfigStore(state => (id ? state.actions.getLayerSetById(id) : null))

export const useLayerSetsByUse = (use: LayerSetConfig['use']): LayerSetConfig[] =>
  useConfigStore(state => state.actions.getLayerSetsByUse(use))

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)
