import { type StateCreator } from 'zustand'

import { DEFAULT_FLOOR_ASSEMBLY_ID, type FloorAssemblyId, createFloorAssemblyId } from '@/building/model'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { type FloorConfig, validateFloorConfig } from '@/construction/floors/types'
import { DEFAULT_FLOOR_LAYER_SETS } from '@/construction/layers/defaults'
import type { LayerConfig } from '@/construction/layers/types'
import { clt, concrete } from '@/construction/materials/material'
import '@/shared/geometry'

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
}

export type FloorAssembliesSlice = FloorAssembliesState & { actions: FloorAssembliesActions }

const validateFloorAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor assembly name cannot be empty')
  }
}

const createDefaultFloorAssemblies = (): FloorAssemblyConfig[] => [
  {
    id: DEFAULT_FLOOR_ASSEMBLY_ID,
    name: 'CLT 18cm (6m)',
    type: 'monolithic',
    thickness: 180,
    material: clt.id,
    layers: {
      topThickness: 60,
      topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
      bottomThickness: 0,
      bottomLayers: []
    }
  },
  {
    id: 'fa_concrete_default' as FloorAssemblyId,
    name: 'Concrete 20cm (6m)',
    type: 'monolithic',
    thickness: 200,
    material: concrete.id,
    layers: {
      topThickness: 60,
      topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
      bottomThickness: 0,
      bottomLayers: []
    }
  }
]

export const createFloorAssembliesSlice: StateCreator<
  FloorAssembliesSlice,
  [['zustand/immer', never]],
  [],
  FloorAssembliesSlice
> = (set, get) => {
  // Initialize with default assemblies
  const defaultFloorAssemblies = createDefaultFloorAssemblies()

  return {
    floorAssemblyConfigs: Object.fromEntries(defaultFloorAssemblies.map(config => [config.id, config])),
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

        set(state => ({
          ...state,
          floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [assembly.id]: assembly }
        }))

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
          const assembly = state.floorAssemblyConfigs[id]
          if (assembly == null) return state

          validateFloorAssemblyName(name)

          const updatedAssembly: FloorAssemblyConfig = {
            ...assembly,
            name: name.trim()
          }
          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateFloorAssemblyConfig: (id: FloorAssemblyId, updates: Partial<Omit<FloorConfig, 'type'>>) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const updatedConfig: FloorAssemblyConfig = { ...config, ...updates, id }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => {
        const state = get()
        const original = state.floorAssemblyConfigs[id]
        if (original == null) {
          throw new Error(`Floor assembly with id ${id} not found`)
        }

        validateFloorAssemblyName(name)

        const newId = createFloorAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim() } as FloorAssemblyConfig

        set(state => ({
          ...state,
          floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [newId]: duplicated }
        }))

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
          // Validate that the config exists
          if (state.floorAssemblyConfigs[configId] == null) {
            throw new Error(`Floor assembly with id ${configId} not found`)
          }

          return {
            ...state,
            defaultFloorAssemblyId: configId
          }
        })
      },

      getDefaultFloorAssemblyId: () => {
        const state = get()
        return state.defaultFloorAssemblyId
      },

      addFloorAssemblyTopLayer: (id: FloorAssemblyId, layer: LayerConfig) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = appendLayer(config.layers.topLayers, layer)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      setFloorAssemblyTopLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = sanitizeLayerArray(layers)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      updateFloorAssemblyTopLayer: (
        id: FloorAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = updateLayerAt(config.layers.topLayers, index, updates)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      removeFloorAssemblyTopLayer: (id: FloorAssemblyId, index: number) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = removeLayerAt(config.layers.topLayers, index)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      moveFloorAssemblyTopLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = moveLayer(config.layers.topLayers, fromIndex, toIndex)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      addFloorAssemblyBottomLayer: (id: FloorAssemblyId, layer: LayerConfig) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const bottomLayers = appendLayer(config.layers.bottomLayers, layer)
          const bottomThickness = sumLayerThickness(bottomLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, bottomLayers, bottomThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      setFloorAssemblyBottomLayers: (id: FloorAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const bottomLayers = sanitizeLayerArray(layers)
          const bottomThickness = sumLayerThickness(bottomLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, bottomLayers, bottomThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      updateFloorAssemblyBottomLayer: (
        id: FloorAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const bottomLayers = updateLayerAt(config.layers.bottomLayers, index, updates)
          const bottomThickness = sumLayerThickness(bottomLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, bottomLayers, bottomThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      removeFloorAssemblyBottomLayer: (id: FloorAssemblyId, index: number) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const bottomLayers = removeLayerAt(config.layers.bottomLayers, index)
          const bottomThickness = sumLayerThickness(bottomLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, bottomLayers, bottomThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      moveFloorAssemblyBottomLayer: (id: FloorAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          const config = state.floorAssemblyConfigs[id]
          if (config == null) return state

          const bottomLayers = moveLayer(config.layers.bottomLayers, fromIndex, toIndex)
          const bottomThickness = sumLayerThickness(bottomLayers)
          const updatedConfig: FloorAssemblyConfig = {
            ...config,
            layers: { ...config.layers, bottomLayers, bottomThickness }
          }
          validateFloorConfig(updatedConfig)

          return {
            ...state,
            floorAssemblyConfigs: { ...state.floorAssemblyConfigs, [id]: updatedConfig }
          }
        })
      }
    } satisfies FloorAssembliesActions
  }
}
