import { type StateCreator } from 'zustand'

import { type RoofAssemblyId, createRoofAssemblyId } from '@/building/model/ids'
import {
  appendLayer,
  moveLayer,
  removeLayerAt,
  sanitizeLayerArray,
  sumLayerThickness,
  updateLayerAt
} from '@/construction/config/store/layerUtils'
import type { TimestampsActions } from '@/construction/config/store/slices/timestampsSlice'
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
  RoofAssembliesSlice & { actions: RoofAssembliesActions & TimestampsActions },
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

        set(state => {
          state.roofAssemblyConfigs[assembly.id] = assembly
          state.actions.updateTimestamp(assembly.id)
        })

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
          state.actions.removeTimestamp(id)

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
          if (!(id in state.roofAssemblyConfigs)) return
          const assembly = state.roofAssemblyConfigs[id]

          validateRoofAssemblyName(name)

          assembly.name = name.trim()
          assembly.nameKey = undefined
          state.actions.updateTimestamp(id)
        })
      },

      updateRoofAssemblyConfig: (id: RoofAssemblyId, updates: Partial<UnionOmit<RoofConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          Object.assign(config, updates, { id })
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      duplicateRoofAssembly: (id: RoofAssemblyId, name: string) => {
        const state = get()
        if (!(id in state.roofAssemblyConfigs)) {
          throw new Error(`Roof assembly with id ${id} not found`)
        }
        const original = state.roofAssemblyConfigs[id]

        validateRoofAssemblyName(name)

        const newId = createRoofAssemblyId()
        const duplicated = { ...original, id: newId, name: name.trim(), nameKey: undefined } as RoofAssemblyConfig

        set(state => {
          state.roofAssemblyConfigs[newId] = duplicated
          state.actions.updateTimestamp(newId)
        })

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
          if (!(configId in state.roofAssemblyConfigs)) {
            throw new Error(`Roof assembly with id ${configId} not found`)
          }
          state.defaultRoofAssemblyId = configId
        })
      },

      getDefaultRoofAssemblyId: () => {
        const state = get()
        return state.defaultRoofAssemblyId
      },

      // Inside layer operations
      addRoofAssemblyInsideLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const insideLayers = appendLayer(config.layers.insideLayers, layer)
          const insideThickness = sumLayerThickness(insideLayers)
          config.layers = { ...config.layers, insideLayers, insideThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      setRoofAssemblyInsideLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const insideLayers = sanitizeLayerArray(layers)
          const insideThickness = sumLayerThickness(insideLayers)
          config.layers = { ...config.layers, insideLayers, insideThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      updateRoofAssemblyInsideLayer: (
        id: RoofAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const insideLayers = updateLayerAt(config.layers.insideLayers, index, updates)
          const insideThickness = sumLayerThickness(insideLayers)
          config.layers = { ...config.layers, insideLayers, insideThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      removeRoofAssemblyInsideLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const insideLayers = removeLayerAt(config.layers.insideLayers, index)
          const insideThickness = sumLayerThickness(insideLayers)
          config.layers = { ...config.layers, insideLayers, insideThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      moveRoofAssemblyInsideLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const insideLayers = moveLayer(config.layers.insideLayers, fromIndex, toIndex)
          const insideThickness = sumLayerThickness(insideLayers)
          config.layers = { ...config.layers, insideLayers, insideThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      // Top layer operations
      addRoofAssemblyTopLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const topLayers = appendLayer(config.layers.topLayers, layer)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      setRoofAssemblyTopLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const topLayers = sanitizeLayerArray(layers)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      updateRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number, updates: Partial<Omit<LayerConfig, 'type'>>) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const topLayers = updateLayerAt(config.layers.topLayers, index, updates)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      removeRoofAssemblyTopLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const topLayers = removeLayerAt(config.layers.topLayers, index)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      moveRoofAssemblyTopLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const topLayers = moveLayer(config.layers.topLayers, fromIndex, toIndex)
          const topThickness = sumLayerThickness(topLayers)
          config.layers = { ...config.layers, topLayers, topThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      // Overhang layer operations
      addRoofAssemblyOverhangLayer: (id: RoofAssemblyId, layer: LayerConfig) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const overhangLayers = appendLayer(config.layers.overhangLayers, layer)
          const overhangThickness = sumLayerThickness(overhangLayers)
          config.layers = { ...config.layers, overhangLayers, overhangThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      setRoofAssemblyOverhangLayers: (id: RoofAssemblyId, layers: LayerConfig[]) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const overhangLayers = sanitizeLayerArray(layers)
          const overhangThickness = sumLayerThickness(overhangLayers)
          config.layers = { ...config.layers, overhangLayers, overhangThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      updateRoofAssemblyOverhangLayer: (
        id: RoofAssemblyId,
        index: number,
        updates: Partial<Omit<LayerConfig, 'type'>>
      ) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const overhangLayers = updateLayerAt(config.layers.overhangLayers, index, updates)
          const overhangThickness = sumLayerThickness(overhangLayers)
          config.layers = { ...config.layers, overhangLayers, overhangThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      removeRoofAssemblyOverhangLayer: (id: RoofAssemblyId, index: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const overhangLayers = removeLayerAt(config.layers.overhangLayers, index)
          const overhangThickness = sumLayerThickness(overhangLayers)
          config.layers = { ...config.layers, overhangLayers, overhangThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      moveRoofAssemblyOverhangLayer: (id: RoofAssemblyId, fromIndex: number, toIndex: number) => {
        set(state => {
          if (!(id in state.roofAssemblyConfigs)) return
          const config = state.roofAssemblyConfigs[id]

          const overhangLayers = moveLayer(config.layers.overhangLayers, fromIndex, toIndex)
          const overhangThickness = sumLayerThickness(overhangLayers)
          config.layers = { ...config.layers, overhangLayers, overhangThickness }
          validateRoofConfig(config)
          state.actions.updateTimestamp(id)
        })
      },

      resetRoofAssembliesToDefaults: () => {
        set(state => {
          const defaultIds = DEFAULT_ROOF_ASSEMBLIES.map(a => a.id)
          const currentIds = Object.keys(state.roofAssemblyConfigs) as RoofAssemblyId[]

          const customAssemblies = Object.fromEntries(
            Object.entries(state.roofAssemblyConfigs).filter(([id]) => !defaultIds.includes(id as RoofAssemblyId))
          )

          const resetAssemblies = Object.fromEntries(DEFAULT_ROOF_ASSEMBLIES.map(assembly => [assembly.id, assembly]))

          const newDefaultId = defaultIds.includes(state.defaultRoofAssemblyId)
            ? DEFAULT_ROOF_ASSEMBLY_ID
            : state.defaultRoofAssemblyId

          for (const id of currentIds) {
            if (!defaultIds.includes(id) && id in customAssemblies) {
              continue
            }
            if (defaultIds.includes(id) && !(id in customAssemblies)) {
              state.actions.removeTimestamp(id)
            }
          }

          for (const assembly of DEFAULT_ROOF_ASSEMBLIES) {
            if (!currentIds.includes(assembly.id)) {
              state.actions.updateTimestamp(assembly.id)
            }
          }

          state.roofAssemblyConfigs = { ...resetAssemblies, ...customAssemblies }
          state.defaultRoofAssemblyId = newDefaultId
        })
      }
    } satisfies RoofAssembliesActions
  }
}
