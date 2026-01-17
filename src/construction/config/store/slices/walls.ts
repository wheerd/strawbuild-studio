import { type StateCreator } from 'zustand'

import { type WallAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import type { WallAssemblyConfig } from '@/construction/config/types'
import type { LayerConfig } from '@/construction/layers/types'
import { type WallConfig, validateWallConfig } from '@/construction/walls/types'

import { DEFAULT_WALL_ASSEMBLIES, DEFAULT_WALL_ASSEMBLY_ID } from './walls.defaults'

export interface WallAssembliesState {
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  defaultWallAssemblyId: WallAssemblyId
}

export interface WallAssembliesActions {
  // CRUD operations for wall assemblies
  addWallAssembly: (name: string, config: WallConfig) => WallAssemblyConfig
  removeWallAssembly: (id: WallAssemblyId) => void
  updateWallAssemblyName: (id: WallAssemblyId, name: string) => void
  updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<Omit<WallConfig, 'type'>>) => void
  duplicateWallAssembly: (id: WallAssemblyId, name: string) => WallAssemblyConfig

  addWallAssemblyInsideLayer: (id: WallAssemblyId, layer: LayerConfig) => void
  setWallAssemblyInsideLayers: (id: WallAssemblyId, layers: LayerConfig[]) => void
  updateWallAssemblyInsideLayer: (
    id: WallAssemblyId,
    index: number,
    updates: Partial<Omit<LayerConfig, 'type'>>
  ) => void
  removeWallAssemblyInsideLayer: (id: WallAssemblyId, index: number) => void
  moveWallAssemblyInsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => void

  addWallAssemblyOutsideLayer: (id: WallAssemblyId, layer: LayerConfig) => void
  setWallAssemblyOutsideLayers: (id: WallAssemblyId, layers: LayerConfig[]) => void
  updateWallAssemblyOutsideLayer: (
    id: WallAssemblyId,
    index: number,
    updates: Partial<Omit<LayerConfig, 'type'>>
  ) => void
  removeWallAssemblyOutsideLayer: (id: WallAssemblyId, index: number) => void
  moveWallAssemblyOutsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => void

  // Wall assembly queries
  getWallAssemblyById: (id: WallAssemblyId) => WallAssemblyConfig | null
  getAllWallAssemblies: () => WallAssemblyConfig[]

  // Default wall assembly management
  setDefaultWallAssembly: (assemblyId: WallAssemblyId) => void
  getDefaultWallAssemblyId: () => WallAssemblyId
  resetWallAssembliesToDefaults: () => void
}

export type WallAssembliesSlice = WallAssembliesState & { actions: WallAssembliesActions }

// Validation functions
const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

export const createWallAssembliesSlice: StateCreator<
  WallAssembliesSlice,
  [['zustand/immer', never]],
  [],
  WallAssembliesSlice
> = (set, get) => {
  return {
    wallAssemblyConfigs: Object.fromEntries(DEFAULT_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly])),
    defaultWallAssemblyId: DEFAULT_WALL_ASSEMBLY_ID,

    actions: {
      // CRUD operations
      addWallAssembly: (name: string, config: WallConfig) => {
        validateWallAssemblyName(name)
        validateWallConfig(config)

        const id = createWallAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as WallAssemblyConfig

        set(state => ({
          ...state,
          wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: assembly }
        }))

        return assembly
      },

      duplicateWallAssembly: (id: WallAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.wallAssemblyConfigs)) {
          throw new Error(`Wall assembly with id ${id} not found`)
        }
        const original = state.wallAssemblyConfigs[id]

        validateWallAssemblyName(name)

        const newId = createWallAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim(),
          nameKey: undefined
        } as WallAssemblyConfig

        set(state => ({
          ...state,
          wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [newId]: duplicated }
        }))

        return duplicated
      },

      removeWallAssembly: (id: WallAssemblyId) => {
        set(state => {
          const { [id]: _removed, ...remainingAssemblies } = state.wallAssemblyConfigs
          return {
            ...state,
            wallAssemblyConfigs: remainingAssemblies,
            defaultWallAssemblyId: state.defaultWallAssemblyId === id ? undefined : state.defaultWallAssemblyId
          }
        })
      },

      updateWallAssemblyName: (id: WallAssemblyId, name: string) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          validateWallAssemblyName(name)

          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            name: name.trim(),
            // Clear nameKey when user edits the name (indicates custom name)
            nameKey: undefined
          }

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<Omit<WallConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            ...config,
            id: assembly.id
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      // Queries
      getWallAssemblyById: (id: WallAssemblyId) => {
        const state = get()
        return state.wallAssemblyConfigs[id] ?? null
      },

      getAllWallAssemblies: () => {
        const state = get()
        return Object.values(state.wallAssemblyConfigs)
      },

      // Default management
      setDefaultWallAssembly: (assemblyId: WallAssemblyId | undefined) => {
        set(state => ({
          ...state,
          defaultWallAssemblyId: assemblyId
        }))
      },

      getDefaultWallAssemblyId: () => {
        const state = get()
        return state.defaultWallAssemblyId
      },

      addWallAssemblyInsideLayer: (id: WallAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const insideLayers = appendLayer(assembly.layers.insideLayers, layer)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, insideLayers, insideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      setWallAssemblyInsideLayers: (id: WallAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const insideLayers = sanitizeLayerArray(layers)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, insideLayers, insideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateWallAssemblyInsideLayer: (
        id: WallAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const insideLayers = updateLayerAt(assembly.layers.insideLayers, index, updates)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, insideLayers, insideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      removeWallAssemblyInsideLayer: (id: WallAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const insideLayers = removeLayerAt(assembly.layers.insideLayers, index)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, insideLayers, insideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      moveWallAssemblyInsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const insideLayers = moveLayer(assembly.layers.insideLayers, fromIndex, toIndex)
          const insideThickness = sumLayerThickness(insideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, insideLayers, insideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      addWallAssemblyOutsideLayer: (id: WallAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const outsideLayers = appendLayer(assembly.layers.outsideLayers, layer)
          const outsideThickness = sumLayerThickness(outsideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, outsideLayers, outsideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      setWallAssemblyOutsideLayers: (id: WallAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const outsideLayers = sanitizeLayerArray(layers)
          const outsideThickness = sumLayerThickness(outsideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, outsideLayers, outsideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateWallAssemblyOutsideLayer: (
        id: WallAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const outsideLayers = updateLayerAt(assembly.layers.outsideLayers, index, updates)
          const outsideThickness = sumLayerThickness(outsideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, outsideLayers, outsideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      removeWallAssemblyOutsideLayer: (id: WallAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const outsideLayers = removeLayerAt(assembly.layers.outsideLayers, index)
          const outsideThickness = sumLayerThickness(outsideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, outsideLayers, outsideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      moveWallAssemblyOutsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.wallAssemblyConfigs)) return state
          const assembly = state.wallAssemblyConfigs[id]

          const outsideLayers = moveLayer(assembly.layers.outsideLayers, fromIndex, toIndex)
          const outsideThickness = sumLayerThickness(outsideLayers)
          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            layers: { ...assembly.layers, outsideLayers, outsideThickness }
          }

          const { id: _id, name: _name, ...wallConfig } = updatedAssembly
          validateWallConfig(wallConfig as WallConfig)

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      resetWallAssembliesToDefaults: () => {
        set(state => {
          // Get default assembly IDs
          const defaultIds = DEFAULT_WALL_ASSEMBLIES.map(a => a.id)

          // Keep only custom assemblies (non-default)
          const customAssemblies = Object.fromEntries(
            Object.entries(state.wallAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as WallAssemblyId))
          )

          // Add fresh default assemblies
          const resetAssemblies = Object.fromEntries(DEFAULT_WALL_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          // Preserve user's default assembly choice if it's a custom assembly, otherwise reset to default
          const newDefaultId = defaultIds.includes(state.defaultWallAssemblyId)
            ? DEFAULT_WALL_ASSEMBLY_ID
            : state.defaultWallAssemblyId

          return {
            ...state,
            wallAssemblyConfigs: { ...resetAssemblies, ...customAssemblies },
            defaultWallAssemblyId: newDefaultId
          }
        })
      }
    } satisfies WallAssembliesActions
  }
}
