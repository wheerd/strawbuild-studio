import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { FloorAssemblyId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import {
  DEFAULT_FLOOR_ASSEMBLY_ID,
  createFloorAssemblyId,
  createRingBeamAssemblyId,
  createWallAssemblyId
} from '@/building/model/ids'
import { type FloorConfig, validateFloorConfig } from '@/construction/floors/types'
import { clt180, concrete, straw, strawbale, wood120x60, wood360x60 } from '@/construction/materials/material'
import { type StrawConfig, validateStrawConfig } from '@/construction/materials/straw'
import { type RingBeamConfig, validateRingBeamConfig } from '@/construction/ringBeams/types'
import { type WallConfig, validateWallConfig } from '@/construction/walls/types'
import '@/shared/geometry'

import { CURRENT_VERSION, applyMigrations } from './migrations'
import type {
  FloorAssemblyConfig,
  FullRingBeamAssemblyConfig,
  InfillWallAssemblyConfig,
  ModulesWallAssemblyConfig,
  NonStrawbaleWallAssemblyConfig,
  RingBeamAssemblyConfig,
  StrawhengeWallAssemblyConfig,
  WallAssemblyConfig
} from './types'

export interface ConfigState {
  straw: StrawConfig
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  floorAssemblyConfigs: Record<FloorAssemblyId, FloorAssemblyConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
  defaultWallAssemblyId: WallAssemblyId
  defaultFloorAssemblyId: FloorAssemblyId
}

export interface ConfigActions {
  // Straw
  getStrawConfig: () => StrawConfig
  updateStrawConfig: (updates: Partial<StrawConfig>) => void

  // CRUD operations for ring beam assemblies
  addRingBeamAssembly: (name: string, config: RingBeamConfig) => RingBeamAssemblyConfig
  removeRingBeamAssembly: (id: RingBeamAssemblyId) => void
  updateRingBeamAssemblyName: (id: RingBeamAssemblyId, name: string) => void
  updateRingBeamAssemblyConfig: (id: RingBeamAssemblyId, config: Partial<Omit<RingBeamConfig, 'type'>>) => void

  // Ring beam assembly queries
  getRingBeamAssemblyById: (id: RingBeamAssemblyId) => RingBeamAssemblyConfig | null
  getAllRingBeamAssemblies: () => RingBeamAssemblyConfig[]

  // Default ring beam management
  setDefaultBaseRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => void
  setDefaultTopRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => void
  getDefaultBaseRingBeamAssemblyId: () => RingBeamAssemblyId | undefined
  getDefaultTopRingBeamAssemblyId: () => RingBeamAssemblyId | undefined

  // CRUD operations for wall assemblies
  addWallAssembly: (name: string, config: WallConfig) => WallAssemblyConfig
  removeWallAssembly: (id: WallAssemblyId) => void
  updateWallAssemblyName: (id: WallAssemblyId, name: string) => void
  updateWallAssemblyConfig: (id: WallAssemblyId, config: Partial<Omit<WallConfig, 'type'>>) => void
  duplicateWallAssembly: (id: WallAssemblyId, name: string) => WallAssemblyConfig

  // Wall assembly queries
  getWallAssemblyById: (id: WallAssemblyId) => WallAssemblyConfig | null
  getAllWallAssemblies: () => WallAssemblyConfig[]

  // Default wall assembly management
  setDefaultWallAssembly: (assemblyId: WallAssemblyId) => void
  getDefaultWallAssemblyId: () => WallAssemblyId

  // CRUD operations for floor assemblies
  addFloorAssembly: (name: string, config: FloorConfig) => FloorAssemblyConfig
  removeFloorAssembly: (id: FloorAssemblyId) => void
  updateFloorAssemblyName: (id: FloorAssemblyId, name: string) => void
  updateFloorAssemblyConfig: (id: FloorAssemblyId, config: Partial<Omit<FloorConfig, 'type'>>) => void
  duplicateFloorAssembly: (id: FloorAssemblyId, name: string) => FloorAssemblyConfig

  // Floor assembly queries
  getFloorAssemblyById: (id: FloorAssemblyId) => FloorAssemblyConfig | null
  getAllFloorAssemblies: () => FloorAssemblyConfig[]

  // Default floor assembly management
  setDefaultFloorAssembly: (configId: FloorAssemblyId) => void
  getDefaultFloorAssemblyId: () => FloorAssemblyId
}

export type ConfigStore = ConfigState & { actions: ConfigActions }

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam assembly name cannot be empty')
  }
}

const validateWallAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Wall assembly name cannot be empty')
  }
}

const validateFloorAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor assembly name cannot be empty')
  }
}

// Config validation is handled by the construction module

const createDefaultStrawConfig = (): StrawConfig => ({
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id
})

// Default ring beam assembly using 360x60 wood
const createDefaultRingBeamAssembly = (): FullRingBeamAssemblyConfig => ({
  id: 'ringbeam_default' as RingBeamAssemblyId,
  name: 'Full 36x6cm',
  type: 'full',
  material: wood360x60.id,
  height: 60,
  width: 360,
  offsetFromEdge: 30
})

// Default floor construction config
const createDefaultFloorAssemblies = (): FloorAssemblyConfig[] => [
  {
    id: DEFAULT_FLOOR_ASSEMBLY_ID,
    name: 'CLT 18cm (6m)',
    type: 'monolithic',
    thickness: 180,
    material: clt180.id,
    layers: {
      topThickness: 60,
      bottomThickness: 0
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
      bottomThickness: 0
    }
  }
]

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
      outsideThickness: 50
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
      outsideThickness: 50
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
      outsideThickness: 50
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
      outsideThickness: 30
    }
  } as NonStrawbaleWallAssemblyConfig
]

const useConfigStore = create<ConfigStore>()(
  persist(
    devtools(
      (set, get) => {
        // Initialize with default assemblies
        const defaultRingBeamAssembly = createDefaultRingBeamAssembly()
        const defaultWallAssemblies = createDefaultWallAssemblies()
        const defaultFloorAssemblies = createDefaultFloorAssemblies()

        return {
          straw: createDefaultStrawConfig(),
          ringBeamAssemblyConfigs: {
            [defaultRingBeamAssembly.id]: defaultRingBeamAssembly
          },
          wallAssemblyConfigs: Object.fromEntries(defaultWallAssemblies.map(assembly => [assembly.id, assembly])),
          floorAssemblyConfigs: Object.fromEntries(defaultFloorAssemblies.map(config => [config.id, config])),
          defaultBaseRingBeamAssemblyId: defaultRingBeamAssembly.id,
          defaultTopRingBeamAssemblyId: defaultRingBeamAssembly.id,
          defaultWallAssemblyId: defaultWallAssemblies[0].id,
          defaultFloorAssemblyId: DEFAULT_FLOOR_ASSEMBLY_ID,

          actions: {
            getStrawConfig: () => {
              const state = get()
              return state.straw
            },

            updateStrawConfig: (updates: Partial<StrawConfig>) => {
              set(state => {
                const next = { ...state.straw, ...updates }
                validateStrawConfig(next)
                return { ...state, straw: next }
              })
            },

            // CRUD operations
            addRingBeamAssembly: (name: string, config: RingBeamConfig) => {
              validateRingBeamName(name)
              validateRingBeamConfig(config)

              const id = createRingBeamAssemblyId()
              const assembly: RingBeamAssemblyConfig = {
                ...config,
                name,
                id
              }

              set(state => ({
                ...state,
                ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: assembly }
              }))

              return assembly
            },

            removeRingBeamAssembly: (id: RingBeamAssemblyId) => {
              set(state => {
                const { [id]: _removed, ...remainingAssemblies } = state.ringBeamAssemblyConfigs
                return {
                  ...state,
                  ringBeamAssemblyConfigs: remainingAssemblies,
                  // Clear defaults if removing the default assembly
                  defaultBaseRingBeamAssemblyId:
                    state.defaultBaseRingBeamAssemblyId === id ? undefined : state.defaultBaseRingBeamAssemblyId,
                  defaultTopRingBeamAssemblyId:
                    state.defaultTopRingBeamAssemblyId === id ? undefined : state.defaultTopRingBeamAssemblyId
                }
              })
            },

            updateRingBeamAssemblyName: (id: RingBeamAssemblyId, name: string) => {
              set(state => {
                const assembly = state.ringBeamAssemblyConfigs[id]
                if (assembly == null) return state

                validateRingBeamName(name)

                const updatedAssembly: RingBeamAssemblyConfig = {
                  ...assembly,
                  name: name.trim()
                }

                return {
                  ...state,
                  ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: updatedAssembly }
                }
              })
            },

            updateRingBeamAssemblyConfig: (id: RingBeamAssemblyId, config: Partial<Omit<RingBeamConfig, 'type'>>) => {
              set(state => {
                const assembly = state.ringBeamAssemblyConfigs[id]
                if (assembly == null) return state

                const updatedAssembly: RingBeamAssemblyConfig = { ...assembly, ...config, id }
                validateRingBeamConfig(updatedAssembly)

                return {
                  ...state,
                  ringBeamAssemblyConfigs: { ...state.ringBeamAssemblyConfigs, [id]: updatedAssembly }
                }
              })
            },

            // Queries
            getRingBeamAssemblyById: (id: RingBeamAssemblyId) => {
              const state = get()
              return state.ringBeamAssemblyConfigs[id] ?? null
            },

            getAllRingBeamAssemblies: () => {
              const state = get()
              return Object.values(state.ringBeamAssemblyConfigs)
            },

            // Default ring beam management
            setDefaultBaseRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => {
              set(state => ({
                ...state,
                defaultBaseRingBeamAssemblyId: assemblyId
              }))
            },

            setDefaultTopRingBeamAssembly: (assemblyId: RingBeamAssemblyId | undefined) => {
              set(state => ({
                ...state,
                defaultTopRingBeamAssemblyId: assemblyId
              }))
            },

            getDefaultBaseRingBeamAssemblyId: () => {
              const state = get()
              return state.defaultBaseRingBeamAssemblyId
            },

            getDefaultTopRingBeamAssemblyId: () => {
              const state = get()
              return state.defaultTopRingBeamAssemblyId
            },

            // Wall assembly CRUD operations
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

            // Perimeter queries
            getWallAssemblyById: (id: WallAssemblyId) => {
              const state = get()
              return state.wallAssemblyConfigs[id] ?? null
            },

            getAllWallAssemblies: () => {
              const state = get()
              return Object.values(state.wallAssemblyConfigs)
            },

            // Default wall assembly management
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
            }
          } satisfies ConfigActions
        }
      },
      { name: 'config-store' }
    ),
    {
      name: 'strawbaler-config',
      version: CURRENT_VERSION,
      partialize: state => ({
        straw: state.straw,
        ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
        wallAssemblyConfigs: state.wallAssemblyConfigs,
        floorAssemblyConfigs: state.floorAssemblyConfigs,
        defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
        defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
        defaultWallAssemblyId: state.defaultWallAssemblyId,
        defaultFloorAssemblyId: state.defaultFloorAssemblyId
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version === CURRENT_VERSION) {
          return persistedState as ConfigState
        }

        try {
          return applyMigrations(persistedState) as ConfigState
        } catch (error) {
          console.error('Migration failed:', error)
          throw error
        }
      }
    }
  )
)

// Selector hooks for easier usage
export const useStrawConfig = (): StrawConfig => useConfigStore(state => state.straw)

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

export const useDefaultWallAssemblyId = (): WallAssemblyId | undefined =>
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

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)

// For non-reactive contexts
export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    straw: state.straw,
    ringBeamAssemblyConfigs: state.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: state.wallAssemblyConfigs,
    floorAssemblyConfigs: state.floorAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: state.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: state.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: state.defaultWallAssemblyId,
    defaultFloorAssemblyId: state.defaultFloorAssemblyId
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  straw?: StrawConfig
  ringBeamAssemblyConfigs: Record<RingBeamAssemblyId, RingBeamAssemblyConfig>
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig>
  floorAssemblyConfigs?: Record<FloorAssemblyId, FloorAssemblyConfig>
  defaultBaseRingBeamAssemblyId?: RingBeamAssemblyId
  defaultTopRingBeamAssemblyId?: RingBeamAssemblyId
  defaultWallAssemblyId: WallAssemblyId
  defaultFloorAssemblyId?: FloorAssemblyId
}) => {
  const state = useConfigStore.getState()
  const strawConfig = data.straw ?? state.straw
  validateStrawConfig(strawConfig)

  useConfigStore.setState({
    straw: strawConfig,
    ringBeamAssemblyConfigs: data.ringBeamAssemblyConfigs,
    wallAssemblyConfigs: data.wallAssemblyConfigs,
    floorAssemblyConfigs: data.floorAssemblyConfigs ?? state.floorAssemblyConfigs,
    defaultBaseRingBeamAssemblyId: data.defaultBaseRingBeamAssemblyId,
    defaultTopRingBeamAssemblyId: data.defaultTopRingBeamAssemblyId,
    defaultWallAssemblyId: data.defaultWallAssemblyId,
    defaultFloorAssemblyId: data.defaultFloorAssemblyId ?? state.defaultFloorAssemblyId
  })
}

// Only for the tests
export const _clearAllAssemblies = () =>
  useConfigStore.setState({
    ringBeamAssemblyConfigs: {},
    wallAssemblyConfigs: {},
    floorAssemblyConfigs: {}
  })
