import type {
  AssemblyId,
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
import type { LayerConfig, LayerSetConfig } from '@/construction/assemblies/layers/types'
import type { MaterialId } from '@/materials/types'
import { subscribeRecords } from '@/shared/utils/subscription'

import { CONFIG_STORE_VERSION, applyMigrations } from './migrations'
import { useConfigStore } from './store'
import type { ConfigActions, ConfigState } from './types'

export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

export const clearPersistence = (): void => {
  localStorage.removeItem('strawbuild-config')
}

export const getInitialConfigState = (): ConfigState => {
  const state = useConfigStore.getInitialState()
  const { actions: _actions, ...rest } = state
  return rest
}

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    defaultStrawMaterial: state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
    perimeterWallAssemblyConfigs: state.perimeterWallAssemblyConfigs,
    interiorWallAssemblyConfigs: state.interiorWallAssemblyConfigs,
    floorAssemblyConfigs: state.floorAssemblyConfigs,
    roofAssemblyConfigs: state.roofAssemblyConfigs,
    openingAssemblyConfigs: state.openingAssemblyConfigs,
    layerSetConfigs: state.layerSetConfigs,
    defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
    defaultPerimeterWallAssemblyId: state.defaultPerimeterWallAssemblyId,
    defaultInteriorWallAssemblyId: state.defaultInteriorWallAssemblyId,
    defaultFloorAssemblyId: state.defaultFloorAssemblyId,
    defaultRoofAssemblyId: state.defaultRoofAssemblyId,
    defaultOpeningAssemblyId: state.defaultOpeningAssemblyId,
    timestamps: state.timestamps
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  defaultStrawMaterial?: MaterialId
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  perimeterWallAssemblyConfigs: Record<PerimeterWallAssemblyId, PerimeterWallAssemblyConfig>
  interiorWallAssemblyConfigs: Record<InteriorWallAssemblyId, InteriorWallAssemblyConfig>
  floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
  roofAssemblyConfigs?: Record<RoofAssemblyId, RoofAssemblyConfig>
  openingAssemblyConfigs?: Record<OpeningAssemblyId, OpeningAssemblyConfig>
  layerSetConfigs?: Record<LayerSetId, LayerSetConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
  defaultPerimeterWallAssemblyId: PerimeterWallAssemblyId
  defaultInteriorWallAssemblyId: InteriorWallAssemblyId
  defaultFloorAssemblyId?: FloorAssemblyId
  defaultRoofAssemblyId?: RoofAssemblyId
  defaultOpeningAssemblyId?: OpeningAssemblyId
  timestamps?: Record<AssemblyId, number>
}) => {
  const state = useConfigStore.getState()

  useConfigStore.setState({
    defaultStrawMaterial: data.defaultStrawMaterial ?? state.defaultStrawMaterial,
    ringBeamAssemblyConfigs: data.ringBeamAssemblyConfigs,
    perimeterWallAssemblyConfigs: data.perimeterWallAssemblyConfigs,
    interiorWallAssemblyConfigs: data.interiorWallAssemblyConfigs,
    floorAssemblyConfigs: data.floorAssemblyConfigs ?? state.floorAssemblyConfigs,
    roofAssemblyConfigs: data.roofAssemblyConfigs ?? state.roofAssemblyConfigs,
    openingAssemblyConfigs: data.openingAssemblyConfigs ?? state.openingAssemblyConfigs,
    layerSetConfigs: data.layerSetConfigs ?? state.layerSetConfigs,
    defaultBaseRingBeamAssemblyId: data.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: data.defaultTopRingBeamAssemblyId,
    defaultPerimeterWallAssemblyId: data.defaultPerimeterWallAssemblyId,
    defaultInteriorWallAssemblyId: data.defaultInteriorWallAssemblyId,
    defaultFloorAssemblyId: data.defaultFloorAssemblyId ?? state.defaultFloorAssemblyId,
    defaultRoofAssemblyId: data.defaultRoofAssemblyId ?? state.defaultRoofAssemblyId,
    defaultOpeningAssemblyId: data.defaultOpeningAssemblyId ?? state.defaultOpeningAssemblyId,
    timestamps: data.timestamps ?? {}
  })
}

// Subscription helpers for derived state invalidation
export const subscribeToWallAssemblies = (
  cb: (
    id: PerimeterWallAssemblyId,
    current?: PerimeterWallAssemblyConfig,
    previous?: PerimeterWallAssemblyConfig
  ) => void
) => subscribeRecords(useConfigStore, s => s.perimeterWallAssemblyConfigs, cb)

export const subscribeToInteriorWallAssemblies = (
  cb: (
    id: InteriorWallAssemblyId,
    current?: InteriorWallAssemblyConfig,
    previous?: InteriorWallAssemblyConfig
  ) => void
) => subscribeRecords(useConfigStore, s => s.interiorWallAssemblyConfigs, cb)

export const subscribeToFloorAssemblies = (
  cb: (id: FloorAssemblyId, current?: FloorAssemblyConfig, previous?: FloorAssemblyConfig) => void
) => subscribeRecords(useConfigStore, s => s.floorAssemblyConfigs, cb)

export const subscribeToRoofAssemblies = (
  cb: (id: RoofAssemblyId, current?: RoofAssemblyConfig, previous?: RoofAssemblyConfig) => void
) => subscribeRecords(useConfigStore, s => s.roofAssemblyConfigs, cb)

export const subscribeToLayerSets = (
  cb: (id: LayerSetId, current?: LayerSetConfig, previous?: LayerSetConfig) => void
) => subscribeRecords(useConfigStore, s => s.layerSetConfigs, cb)

export const subscribeToConfigChanges = useConfigStore.subscribe

export function hydrateConfigState(state: unknown, version: number): ConfigState {
  const migratedState =
    version < CONFIG_STORE_VERSION ? (applyMigrations(state) as ConfigState) : (state as ConfigState)
  useConfigStore.setState(migratedState)
  return migratedState
}

// Layer set helpers
export const getLayerSetById = (id: LayerSetId | undefined): LayerSetConfig | null => {
  if (!id) return null
  return useConfigStore.getState().layerSetConfigs[id] ?? null
}

export const resolveLayerSetLayers = (id: LayerSetId | undefined): LayerConfig[] => {
  const layerSet = getLayerSetById(id)
  return layerSet?.layers ?? []
}

export const resolveLayerSetThickness = (id: LayerSetId | undefined): number => {
  const layerSet = getLayerSetById(id)
  return layerSet?.totalThickness ?? 0
}
