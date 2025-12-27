import { type StateCreator } from 'zustand'

import { type RoofAssemblyId, createRoofAssemblyId } from '@/building/model'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import type { LayerConfig } from '@/construction/layers/types'
import { type RoofConfig, validateRoofConfig } from '@/construction/roofs/types'

import { DEFAULT_ROOF_ASSEMBLIES, DEFAULT_ROOF_ASSEMBLY_ID } from './roofs.defaults'

export interface RoofAssembliesState {
  roofAssemblyConfigs: Record<RoofAssemblyId, RoofAssemblyConfig>
  defaultRoofAssemblyId: RoofAssemblyId
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface RoofAssembliesActions {
  // CRUD operations
  addRoofAssembly: (name: string, config: RoofConfig) => RoofAssemblyConfig
  removeRoofAssembly: (id: RoofAssemblyId) => void
  updateRoofAssemblyName: (id: RoofAssemblyId, name: string) => void
  updateRoofAssemblyConfig: (id: RoofAssemblyId, config: Partial<UnionOmit<RoofConfig, 'type'>>) => void
  duplicateRoofAssembly: (id: RoofAssemblyId, name: string) => RoofAssemblyConfig

  // Inside layer operations
  addRoofAssemblyInsideLayer: (id: RoofAssemblyId, layer: LayerConfig) => void
  setRoofAssemblyInsideLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => void
  updateRoofAssemblyInsideLayer: (
    id: RoofAssemblyId,
    index: number,
    updates: Partial<Omit<LayerConfig, 'type'>>
  ) => void
  removeRoofAssemblyInsideLayer: (id: RoofAssemblyId, index: number) => void
  moveRoofAssemblyInsideLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => void

  // Top layer operations
  addRoofAssemblyTopLayer: (id: RoofAssemblyId, layer: LayerConfig) => void
  setRoofAssemblyTopLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => void
  updateRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => void
  removeRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number) => void
  moveRoofAssemblyTopLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => void

  // Overhang layer operations
  addRoofAssemblyOverhangLayer: (id: RoofAssemblyId, layer: LayerConfig) => void
  setRoofAssemblyOverhangLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => void
  updateRoofAssemblyOverhangLayer: (
    id: RoofAssemblyId,
    index: number,
    updates: Partial<Omit<LayerConfig, 'type'>>
  ) => void
  removeRoofAssemblyOverhangLayer: (id: RoofAssemblyId, index: number) => void
  moveRoofAssemblyOverhangLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => void

  // Queries
  getRoofAssemblyById: (id: RoofAssemblyId) => RoofAssemblyConfig | null
  getAllRoofAssemblies: () => RoofAssemblyConfig[]

  // Default management
  setDefaultRoofAssembly: (configId: RoofAssemblyId) => void
  getDefaultRoofAssemblyId: () => RoofAssemblyId
  resetRoofAssembliesToDefaults: () => void
}

export type RoofAssembliesSlice = RoofAssembliesState & { actions: RoofAssembliesActions }

const validateRoofAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Roof assembly name cannot be empty')
  }
}

export const createRoofAssembliesSlice: StateCreator<
  RoofAssembliesSlice,
  [['zustand/immer', never]],
  [],
  RoofAssembliesSlice
> = (set, get) => {
  // Initialize with default assemblies

  return {
    roofAssemblyConfigs: Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(config => [config.id, config])),
    defaultRoofAssemblyId: DEFAULT_ROOF_ASSEMBLY_ID,

    actions: {
      // Roof assembly CRUD operations
      addRoofAssembly: (name: string, config: RoofConfig) => {
        validateRoofAssemblyName(name)
        validateRoofConfig(config)

        const id = createRoofAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as RoofAssemblyConfig

        set(state => ({
          ...state,
          roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [assembly.id]: assembly }
        }))

        return assembly
      },

      removeRoofAssembly: (id: RoofAssemblyId) => {
        set(state => {
          const { roofAssemblyConfigs } = state

          // Prevent removing the last config
          if (Object.keys(roofAssemblyConfigs).length === 1) {
            throw new Error('Cannot remove the last roof assembly')
          }

          const { [id]: _removed, ...remainingConfigs } = roofAssemblyConfigs

          // If removing the default, set first remaining config as default
          let newDefaultId = state.defaultRoofAssemblyId
          if (state.defaultRoofAssemblyId === id) {
            newDefaultId = Object.keys(remainingConfigs)[0] as RoofAssemblyId
          }

          return {
            ...state,
            roofAssemblyConfigs: remainingConfigs,
            defaultRoofAssemblyId: newDefaultId
          }
        })
      },

      updateRoofAssemblyName: (id: RoofAssemblyId, name: string) => {
        set(state => {
          const assembly = state.roofAssemblyConfigs[id]
          if (assembly == null) return state

          validateRoofAssemblyName(name)

          const updatedAssembly: RoofAssemblyConfig = {
            ...assembly,
            name: name.trim()
          }
          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateRoofAssemblyConfig: (id: RoofAssemblyId, updates: Partial<UnionOmit<RoofConfig, 'type'>>) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const updatedConfig: RoofAssemblyConfig = { ...config, ...updates, id }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      duplicateRoofAssembly: (id: RoofAssemblyId, name: string) => {
        const state = get()
        const original = state.roofAssemblyConfigs[id]
        if (original == null) {
          throw new Error(`Roof assembly with id ${id} not found`)
        }

        validateRoofAssemblyName(name)

        const newId = createRoofAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim() } as RoofAssemblyConfig

        set(state => ({
          ...state,
          roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [newId]: duplicated }
        }))

        return duplicated
      },

      // Roof queries
      getRoofAssemblyById: (id: RoofAssemblyId) => {
        const state = get()
        return state.roofAssemblyConfigs[id] ?? null
      },

      getAllRoofAssemblies: () => {
        const state = get()
        return Object.values(state.roofAssemblyConfigs)
      },

      // Default roof config management
      setDefaultRoofAssembly: (configId: RoofAssemblyId) => {
        set(state => {
          // Validate that the config exists
          if (state.roofAssemblyConfigs[configId] == null) {
            throw new Error(`Roof assembly with id ${configId} not found`)
          }

          return {
            ...state,
            defaultRoofAssemblyId: configId
          }
        })
      },

      getDefaultRoofAssemblyId: () => {
        const state = get()
        return state.defaultRoofAssemblyId
      },

      // Inside layer operations
      addRoofAssemblyInsideLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const insideLayers = appendLayer(config.layers.insideLayers, layer)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, insideLayers, insideThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      setRoofAssemblyInsideLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const insideLayers = sanitizeLayerArray(layers)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, insideLayers, insideThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      updateRoofAssemblyInsideLayer: (
        id: RoofAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const insideLayers = updateLayerAt(config.layers.insideLayers, index, updates)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, insideLayers, insideThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      removeRoofAssemblyInsideLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const insideLayers = removeLayerAt(config.layers.insideLayers, index)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, insideLayers, insideThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      moveRoofAssemblyInsideLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const insideLayers = moveLayer(config.layers.insideLayers, fromIndex, toIndex)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, insideLayers, insideThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      // Top layer operations
      addRoofAssemblyTopLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = appendLayer(config.layers.topLayers, layer)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      setRoofAssemblyTopLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = sanitizeLayerArray(layers)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      updateRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = updateLayerAt(config.layers.topLayers, index, updates)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      removeRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = removeLayerAt(config.layers.topLayers, index)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      moveRoofAssemblyTopLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const topLayers = moveLayer(config.layers.topLayers, fromIndex, toIndex)
          const topThickness = sumLayerThickness(topLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, topLayers, topThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      // Overhang layer operations
      addRoofAssemblyOverhangLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const overhangLayers = appendLayer(config.layers.overhangLayers, layer)
          const overhangThickness = sumLayerThickness(overhangLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, overhangLayers, overhangThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      setRoofAssemblyOverhangLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const overhangLayers = sanitizeLayerArray(layers)
          const overhangThickness = sumLayerThickness(overhangLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, overhangLayers, overhangThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      updateRoofAssemblyOverhangLayer: (
        id: RoofAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const overhangLayers = updateLayerAt(config.layers.overhangLayers, index, updates)
          const overhangThickness = sumLayerThickness(overhangLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, overhangLayers, overhangThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      removeRoofAssemblyOverhangLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const overhangLayers = removeLayerAt(config.layers.overhangLayers, index)
          const overhangThickness = sumLayerThickness(overhangLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, overhangLayers, overhangThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      moveRoofAssemblyOverhangLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          const config = state.roofAssemblyConfigs[id]
          if (config == null) return state

          const overhangLayers = moveLayer(config.layers.overhangLayers, fromIndex, toIndex)
          const overhangThickness = sumLayerThickness(overhangLayers)
          const updatedConfig: RoofAssemblyConfig = {
            ...config,
            layers: { ...config.layers, overhangLayers, overhangThickness }
          }
          validateRoofConfig(updatedConfig)

          return {
            ...state,
            roofAssemblyConfigs: { ...state.roofAssemblyConfigs, [id]: updatedConfig }
          }
        })
      },

      resetRoofAssembliesToDefaults: () => {
        set(state => {
          // Get default assembly IDs
          const defaultIds = DEFAULT_ROOF_ASSEMBLIES.map(a => a.id)

          // Keep only custom assemblies (non-default)
          const customAssemblies = Object.fromEntries(
            Object.entries(state.roofAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as RoofAssemblyId))
          )

          // Add fresh default assemblies
          const resetAssemblies = Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          // Preserve user's default assembly choice if it's a custom assembly, otherwise reset to default
          const newDefaultId = defaultIds.includes(state.defaultRoofAssemblyId)
            ? DEFAULT_ROOF_ASSEMBLY_ID
            : state.defaultRoofAssemblyId

          return {
            ...state,
            roofAssemblyConfigs: { ...resetAssemblies, ...customAssemblies },
            defaultRoofAssemblyId: newDefaultId
          }
        })
      }
    } satisfies RoofAssembliesActions
  }
}
