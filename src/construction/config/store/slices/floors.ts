import { type StateCreator } from 'zustand'

import { type FloorAssemblyId, createFloorAssemblyId } from '@/building/model/ids'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import type { TimestampsActions } from '@/construction/config/store/slices/timestampsSlice'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { type FloorConfig, validateFloorConfig } from '@/construction/floors/types'
import type { LayerConfig } from '@/construction/layers/types'

import { DEFAULT_FLOOR_ASSEMBLIES, DEFAULT_FLOOR_ASSEMBLY_ID } from './floors.defaults'

export interface FloorAssembliesState {
  floorAssemblyConfigs: Record<FloorAssemblyId, FloorAssemblyConfig>
  defaultFloorAssemblyId: FloorAssemblyId
}

export interface FloorAssembliesActions {
  // CRUD operations
  addFloorAssembly: (name: string, config: FloorConfig) => FloorAssemblyConfig
  removeFloorAssembly: (id: FloorAssemblyId) => void
  updateFloorAssemblyName: (id: FloorAssemblyId, name: string) => void
  updateFloorAssemblyConfig: (id: FloorAssemblyId, config: Partial<Omit<FloorConfig, 'type'>>) => void
  duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => FloorAssemblyConfig
  addFloorAssemblyTopLayer: (id: FloorAssemblyId, layer: LayerConfig) => void
  setFloorAssemblyTopLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => void
  updateFloorAssemblyTopLayer: (id: FloorAssemblyId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  removeFloorAssemblyTopLayer: (id: FloorAssemblyId, index: number) => void
  moveFloorAssemblyTopLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => void
  addFloorAssemblyBottomLayer: (id: FloorAssemblyId, layer: LayerConfig) => void
  setFloorAssemblyBottomLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => void
  updateFloorAssemblyBottomLayer: (
    id: FloorAssemblyId,
    index: number,
    updates: Partial<Omit<LayerConfig, 'type'>>
  ) => void
  removeFloorAssemblyBottomLayer: (id: FloorAssemblyId, index: number) => void
  moveFloorAssemblyBottomLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => void

  // Queries
  getFloorAssemblyById: (id: FloorAssemblyId) => FloorAssemblyConfig | null
  getAllFloorAssemblies: () => FloorAssemblyConfig[]

  // Default management
  setDefaultFloorAssembly: (configId: FloorAssemblyId) => void
  getDefaultFloorAssemblyId: () => FloorAssemblyId
  resetFloorAssembliesToDefaults: () => void
}

export type FloorAssembliesSlice = FloorAssembliesState & { actions: FloorAssembliesActions }

const validateFloorAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor assembly name cannot be empty')
  }
}

export const createFloorAssembliesSlice: StateCreator<
  FloorAssembliesSlice & { actions: FloorAssembliesActions & TimestampsActions },
  [['zustand/immer', never]],
  [],
  FloorAssembliesSlice
> = (set, get) => {
  return {
    floorAssemblyConfigs: Object.fromEntries(DEFAULT_FLOOR_ASSEMBLIES.map(config => [config.id, config])),
    defaultFloorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID,

    actions: {
      // Floor construction config CRUD operations
      addFloorAssembly: (name: string, config: FloorConfig) => {
        validateFloorAssemblyName(name)
        validateFloorConfig(config)

        const id = createFloorAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as FloorAssemblyConfig

        set(state => {
          state.floorAssemblyConfigs[assembly.id] = assembly
          state.actions.updateTimestamp(assembly.id)
        })

        return assembly
      },

      removeFloorAssembly: (id: FloorAssemblyId) => {
        set(state => {
          const { floorAssemblyConfigs } = state

          // Prevent removing the last config
          if (Object.keys(floorAssemblyConfigs).length === 1) {
            throw new Error('Cannot remove the last floor assembly')
          }

          const { [id]: _removed, ...remainingConfigs } = floorAssemblyConfigs
          state.actions.removeTimestamp(id)

          // If removing the default, set first remaining config as default
          let newDefaultId = state.defaultFloorAssemblyId
          if (state.defaultFloorAssemblyId === id) {
            newDefaultId = Object.keys(remainingConfigs)[0] as FloorAssemblyId
          }

          return {
            ...state,
            floorAssemblyConfigs: remainingConfigs,
            defaultFloorAssemblyId: newDefaultId
          }
        })
      },

      updateFloorAssemblyName: (id: FloorAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const assembly = state.floorAssemblyConfigs[id]

          validateFloorAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          state.actions.updateTimestamp(id)
        })
      },

      updateFloorAssemblyConfig: (id: FloorAssemblyId, updates: Partial<Omit<FloorConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const updatedConfig: FloorAssemblyConfig = { ...config, ...updates, id }
          validateFloorConfig(updatedConfig)

          state.floorAssemblyConfigs[id] = updatedConfig
          state.actions.updateTimestamp(id)
        })
      },

      duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.floorAssemblyConfigs)) {
          throw new Error(`Floor assembly with id ${id} not found`)
        }
        const original = state.floorAssemblyConfigs[id]

        validateFloorAssemblyName(name)

        const newId = createFloorAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim(), nameKey: undefined } as FloorAssemblyConfig

        set(state => {
          state.floorAssemblyConfigs[newId] = duplicated
          state.actions.updateTimestamp(newId)
        })

        return duplicated
      },

      // Floor queries
      getFloorAssemblyById: (id: FloorAssemblyId) => {
        const state = get()
        return state.floorAssemblyConfigs[id] ?? null
      },

      getAllFloorAssemblies: () => {
        const state = get()
        return Object.values(state.floorAssemblyConfigs)
      },

      // Default floor config management
      setDefaultFloorAssembly: (configId: FloorAssemblyId) => {
        set(state => {
          if (!(configId in state.floorAssemblyConfigs)) {
            throw new Error(`Floor assembly with id ${configId} not found`)
          }
          state.defaultFloorAssemblyId = configId
        })
      },

      getDefaultFloorAssemblyId: () => {
        const state = get()
        return state.defaultFloorAssemblyId
      },

      addFloorAssemblyTopLayer: (id: FloorAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const topLayers = appendLayer(config.layers.topLayers, layer)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      setFloorAssemblyTopLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const topLayers = sanitizeLayerArray(layers)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      updateFloorAssemblyTopLayer: (
        id: FloorAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const topLayers = updateLayerAt(config.layers.topLayers, index, updates)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      removeFloorAssemblyTopLayer: (id: FloorAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const topLayers = removeLayerAt(config.layers.topLayers, index)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      moveFloorAssemblyTopLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const topLayers = moveLayer(config.layers.topLayers, fromIndex, toIndex)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      addFloorAssemblyBottomLayer: (id: FloorAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const bottomLayers = appendLayer(config.layers.bottomLayers, layer)
          const bottomThickness = sumLayerThickness(bottomLayers)
          config.layers = { ...config.layers, bottomLayers, bottomThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      setFloorAssemblyBottomLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const bottomLayers = sanitizeLayerArray(layers)
          const bottomThickness = sumLayerThickness(bottomLayers)
          config.layers = { ...config.layers, bottomLayers, bottomThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      updateFloorAssemblyBottomLayer: (
        id: FloorAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const bottomLayers = updateLayerAt(config.layers.bottomLayers, index, updates)
          const bottomThickness = sumLayerThickness(bottomLayers)
          config.layers = { ...config.layers, bottomLayers, bottomThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      removeFloorAssemblyBottomLayer: (id: FloorAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const bottomLayers = removeLayerAt(config.layers.bottomLayers, index)
          const bottomThickness = sumLayerThickness(bottomLayers)
          config.layers = { ...config.layers, bottomLayers, bottomThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      moveFloorAssemblyBottomLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.floorAssemblyConfigs)) return
          const config = state.floorAssemblyConfigs[id]

          const bottomLayers = moveLayer(config.layers.bottomLayers, fromIndex, toIndex)
          const bottomThickness = sumLayerThickness(bottomLayers)
          config.layers = { ...config.layers, bottomLayers, bottomThickness }
          validateFloorConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      resetFloorAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_FLOOR_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.floorAssemblyConfigs) as FloorAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.floorAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as FloorAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(DEFAULT_FLOOR_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          const newDefaultId = defaultIds.includes(state.defaultFloorAssemblyId)
            ? DEFAULT_FLOOR_ASSEMBLY_ID
            : state.defaultFloorAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              state.actions.removeTimestamp(id)
            }
          }

          for (const assembly of DEFAULT_FLOOR_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              state.actions.updateTimestamp(assembly.id)
            }
          }

          state.floorAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultFloorAssemblyId = newDefaultId
        })
      }
    } satisfies FloorAssembliesActions
  }
}
