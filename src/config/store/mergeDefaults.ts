import { DEFAULT_FLOOR_ASSEMBLIES } from './slices/floors.defaults'
import { DEFAULT_INTERIOR_WALL_ASSEMBLIES } from './slices/interiorWalls.defaults'
import { DEFAULT_LAYER_SETS } from './slices/layers.defaults'
import { DEFAULT_OPENING_ASSEMBLIES } from './slices/opening.defaults'
import { DEFAULT_PERIMETER_WALL_ASSEMBLIES } from './slices/perimeterWalls.defaults'
import { DEFAULT_RING_BEAM_ASSEMBLIES } from './slices/ringBeams.defaults'
import { DEFAULT_ROOF_ASSEMBLIES } from './slices/roofs.defaults'
import type { ConfigState } from './types'

interface HasNameAndKey {
  id: string
  name: string
  nameKey?: unknown
}

function mergeWithDefaults<T extends HasNameAndKey>(
  persistedConfigs: Record<string, T> | undefined,
  defaults: T[]
): Record<string, T> {
  const result: Partial<Record<string, T>> = persistedConfigs ? { ...persistedConfigs } : {}

  for (const defaultConfig of defaults) {
    const persisted = result[defaultConfig.id]

    if (persisted && persisted.name === defaultConfig.name) {
      persisted.nameKey = defaultConfig.nameKey
    }
  }

  return result as Record<string, T>
}

export function mergeStateWithDefaults(state: ConfigState): void {
  state.layerSetConfigs = mergeWithDefaults(state.layerSetConfigs, DEFAULT_LAYER_SETS)
  state.perimeterWallAssemblyConfigs = mergeWithDefaults(
    state.perimeterWallAssemblyConfigs,
    DEFAULT_PERIMETER_WALL_ASSEMBLIES
  )
  state.interiorWallAssemblyConfigs = mergeWithDefaults(
    state.interiorWallAssemblyConfigs,
    DEFAULT_INTERIOR_WALL_ASSEMBLIES
  )
  state.floorAssemblyConfigs = mergeWithDefaults(state.floorAssemblyConfigs, DEFAULT_FLOOR_ASSEMBLIES)
  state.roofAssemblyConfigs = mergeWithDefaults(state.roofAssemblyConfigs, DEFAULT_ROOF_ASSEMBLIES)
  state.openingAssemblyConfigs = mergeWithDefaults(state.openingAssemblyConfigs, DEFAULT_OPENING_ASSEMBLIES)
  state.ringBeamAssemblyConfigs = mergeWithDefaults(state.ringBeamAssemblyConfigs, DEFAULT_RING_BEAM_ASSEMBLIES)
}
