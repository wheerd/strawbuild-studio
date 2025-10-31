import { type StateCreator } from 'zustand'

import { type WallAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type {
  InfillWallAssemblyConfig,
  ModulesWallAssemblyConfig,
  NonStrawbaleWallAssemblyConfig,
  StrawhengeWallAssemblyConfig,
  WallAssemblyConfig
} from '@/construction/config/types'
import { concrete, straw, strawbale, wood120x60, wood360x60 } from '@/construction/materials/material'
import { type WallConfig, validateWallConfig } from '@/construction/walls/types'
import '@/shared/geometry'

import type { LayerConfig } from '@/construction/layers/types'

import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'

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
  updateWallAssemblyInsideLayer: (id: WallAssemblyId, index: number, updates: Partial<LayerConfig>) => void
  removeWallAssemblyInsideLayer: (id: WallAssemblyId, index: number) => void
  moveWallAssemblyInsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => void
  addWallAssemblyOutsideLayer: (id: WallAssemblyId, layer: LayerConfig) => void
  updateWallAssemblyOutsideLayer: (id: WallAssemblyId, index: number, updates: Partial<LayerConfig>) => void
  removeWallAssemblyOutsideLayer: (id: WallAssemblyId, index: number) => void
  moveWallAssemblyOutsideLayer: (id: WallAssemblyId, fromIndex: number, toIndex: number) => void

  // Wall assembly queries
  getWallAssemblyById: (id: WallAssemblyId) => WallAssemblyConfig | null
  getAllWallAssemblies: () => WallAssemblyConfig[]

  // Default wall assembly management
  setDefaultWallAssembly: (assemblyId: WallAssemblyId) => void
  getDefaultWallAssemblyId: () => WallAssemblyId
}

export type WallAssembliesSlice = WallAssembliesState & { actions: WallAssembliesActions }

// Validation functions
const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

// Default wall assemblies
const createDefaultWallAssemblies = (): WallAssemblyConfig[] => [
  {
    id: 'wa_infill_default' as WallAssemblyId,
    name: 'Standard Infill',
    type: 'infill',
    maxPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'double',
      width: 60,
      thickness: 120,
      infillMaterial: straw.id,
      material: wood120x60.id
    },
    openings: {
      padding: 15,
      headerThickness: 60,
      headerMaterial: wood360x60.id,
      sillThickness: 60,
      sillMaterial: wood360x60.id
    },
    layers: {
      insideThickness: 30,
      insideLayers: [],
      outsideThickness: 50,
      outsideLayers: []
    }
  } as InfillWallAssemblyConfig,
  {
    id: 'wa_strawhenge_default' as WallAssemblyId,
    name: 'Strawhenge Module',
    type: 'strawhenge',
    module: {
      width: 920,
      type: 'single',
      frameThickness: 60,
      frameMaterial: wood360x60.id,
      strawMaterial: strawbale.id
    },
    infill: {
      maxPostSpacing: 800,
      minStrawSpace: 70,
      posts: {
        type: 'full',
        width: 60,
        material: wood360x60.id
      }
    },
    openings: {
      padding: 15,
      headerThickness: 60,
      headerMaterial: wood360x60.id,
      sillThickness: 60,
      sillMaterial: wood360x60.id
    },
    layers: {
      insideThickness: 30,
      insideLayers: [],
      outsideThickness: 50,
      outsideLayers: []
    }
  } as StrawhengeWallAssemblyConfig,
  {
    id: 'wa_module_default' as WallAssemblyId,
    name: 'Default Module',
    type: 'modules',
    module: {
      width: 920,
      type: 'single',
      frameThickness: 60,
      frameMaterial: wood360x60.id,
      strawMaterial: strawbale.id
    },
    infill: {
      maxPostSpacing: 800,
      minStrawSpace: 70,
      posts: {
        type: 'full',
        width: 60,
        material: wood360x60.id
      }
    },
    openings: {
      padding: 15,
      headerThickness: 60,
      headerMaterial: wood360x60.id,
      sillThickness: 60,
      sillMaterial: wood360x60.id
    },
    layers: {
      insideThickness: 30,
      insideLayers: [],
      outsideThickness: 50,
      outsideLayers: []
    }
  } as ModulesWallAssemblyConfig,
  {
    id: 'wa_non_strawbale_default' as WallAssemblyId,
    name: 'Non-Strawbale Wall',
    type: 'non-strawbale',
    material: concrete.id,
    thickness: 200,
    openings: {
      padding: 15,
      headerThickness: 60,
      headerMaterial: wood360x60.id,
      sillThickness: 60,
      sillMaterial: wood360x60.id
    },
    layers: {
      insideThickness: 30,
      insideLayers: [],
      outsideThickness: 30,
      outsideLayers: []
    }
  } as NonStrawbaleWallAssemblyConfig
]

export const createWallAssembliesSlice: StateCreator<
  WallAssembliesSlice,
  [['zustand/immer', never]],
  [],
  WallAssembliesSlice
> = (set, get) => {
  // Initialize with default assemblies
  const defaultWallAssemblies = createDefaultWallAssemblies()

  return {
    wallAssemblyConfigs: Object.fromEntries(defaultWallAssemblies.map(assembly => [assembly.id, assembly])),
    defaultWallAssemblyId: defaultWallAssemblies[0].id,

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
        const original = state.wallAssemblyConfigs[id]
        if (original == null) {
          throw new Error(`Wall assembly with id ${id} not found`)
        }

        validateWallAssemblyName(name)

        const newId = createWallAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim()
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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

          validateWallAssemblyName(name)

          const updatedAssembly: WallAssemblyConfig = {
            ...assembly,
            name: name.trim()
          }

          return {
            ...state,
            wallAssemblyConfigs: { ...state.wallAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<Omit<WallConfig, 'type'>>) => {
        set(state => {
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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

      updateWallAssemblyInsideLayer: (id: WallAssemblyId, index: number, updates: Partial<LayerConfig>) => {
        set(state => {
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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

      updateWallAssemblyOutsideLayer: (id: WallAssemblyId, index: number, updates: Partial<LayerConfig>) => {
        set(state => {
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
          const assembly = state.wallAssemblyConfigs[id]
          if (assembly == null) return state

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
      }
    } satisfies WallAssembliesActions
  }
}
