import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type {
  PerimeterConstructionMethodId,
  RingBeamConstructionMethodId,
  SlabConstructionConfigId
} from '@/building/model/ids'
import {
  DEFAULT_SLAB_CONFIG_ID,
  createPerimeterConstructionMethodId,
  createRingBeamConstructionMethodId,
  createSlabConstructionConfigId
} from '@/building/model/ids'
import type {
  MonolithicSlabConstructionConfig,
  PerimeterConstructionConfig,
  PerimeterConstructionMethod,
  RingBeamConstructionMethod,
  SlabConstructionConfig,
  WallLayersConfig
} from '@/construction/config/types'
import { clt180, concrete, straw, strawbale, wood120x60, wood360x60 } from '@/construction/materials/material'
import { type RingBeamConfig, validateRingBeamConfig } from '@/construction/ringBeams/ringBeams'
import { createLength } from '@/shared/geometry'

export interface ConfigState {
  ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
  slabConstructionConfigs: Record<SlabConstructionConfigId, SlabConstructionConfig>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
  defaultPerimeterMethodId: PerimeterConstructionMethodId
  defaultSlabConfigId: SlabConstructionConfigId
}

export interface ConfigActions {
  // CRUD operations for ring beam construction methods
  addRingBeamConstructionMethod: (name: string, config: RingBeamConfig) => RingBeamConstructionMethod
  removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => void
  updateRingBeamConstructionMethodName: (id: RingBeamConstructionMethodId, name: string) => void
  updateRingBeamConstructionMethodConfig: (id: RingBeamConstructionMethodId, config: RingBeamConfig) => void

  // Queries
  getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => RingBeamConstructionMethod | null
  getAllRingBeamConstructionMethods: () => RingBeamConstructionMethod[]

  // Default ring beam management
  setDefaultBaseRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => void
  setDefaultTopRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => void
  getDefaultBaseRingBeamMethodId: () => RingBeamConstructionMethodId | undefined
  getDefaultTopRingBeamMethodId: () => RingBeamConstructionMethodId | undefined

  // CRUD operations for perimeter construction methods
  addPerimeterConstructionMethod: (
    name: string,
    config: PerimeterConstructionConfig,
    layers: WallLayersConfig
  ) => PerimeterConstructionMethod
  duplicatePerimeterConstructionMethod: (id: PerimeterConstructionMethodId, name: string) => PerimeterConstructionMethod
  removePerimeterConstructionMethod: (id: PerimeterConstructionMethodId) => void
  updatePerimeterConstructionMethodName: (id: PerimeterConstructionMethodId, name: string) => void
  updatePerimeterConstructionMethodConfig: (
    id: PerimeterConstructionMethodId,
    config: PerimeterConstructionConfig
  ) => void
  updatePerimeterConstructionMethodLayers: (id: PerimeterConstructionMethodId, layers: WallLayersConfig) => void

  // Perimeter queries
  getPerimeterConstructionMethodById: (id: PerimeterConstructionMethodId) => PerimeterConstructionMethod | null
  getAllPerimeterConstructionMethods: () => PerimeterConstructionMethod[]

  // Default perimeter method management
  setDefaultPerimeterMethod: (methodId: PerimeterConstructionMethodId | undefined) => void
  getDefaultPerimeterMethodId: () => PerimeterConstructionMethodId

  // CRUD operations for slab construction configs
  addSlabConstructionConfig: (config: SlabConstructionConfig) => SlabConstructionConfig
  removeSlabConstructionConfig: (id: SlabConstructionConfigId) => void
  updateSlabConstructionConfig: (id: SlabConstructionConfigId, config: Omit<SlabConstructionConfig, 'id'>) => void
  duplicateSlabConstructionConfig: (id: SlabConstructionConfigId, name: string) => SlabConstructionConfig

  // Slab queries
  getSlabConstructionConfigById: (id: SlabConstructionConfigId) => SlabConstructionConfig | null
  getAllSlabConstructionConfigs: () => SlabConstructionConfig[]

  // Default slab config management
  setDefaultSlabConfig: (configId: SlabConstructionConfigId) => void
  getDefaultSlabConfigId: () => SlabConstructionConfigId
}

export type ConfigStore = ConfigState & { actions: ConfigActions }

// Validation functions
const validateRingBeamName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Ring beam construction method name cannot be empty')
  }
}

const validatePerimeterMethodName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Perimeter construction method name cannot be empty')
  }
}

const validateSlabConfigName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Slab construction config name cannot be empty')
  }
}

const validateSlabConfig = (config: SlabConstructionConfig): void => {
  validateSlabConfigName(config.name)

  if (config.type === 'monolithic') {
    if (config.thickness <= 0) {
      throw new Error('CLT thickness must be greater than 0')
    }
  } else if (config.type === 'joist') {
    if (config.joistHeight <= 0 || config.joistThickness <= 0) {
      throw new Error('Joist dimensions must be greater than 0')
    }
    if (config.joistSpacing <= 0) {
      throw new Error('Joist spacing must be greater than 0')
    }
    if (config.subfloorThickness <= 0) {
      throw new Error('Subfloor thickness must be greater than 0')
    }
  }

  if (config.layers.topThickness < 0 || config.layers.bottomThickness < 0) {
    throw new Error('Layer thicknesses cannot be negative')
  }
}

// Config validation is handled by the construction module

// Default ring beam construction method using 360x60 wood
const createDefaultRingBeamMethod = (): RingBeamConstructionMethod => ({
  id: 'ringbeam_default' as RingBeamConstructionMethodId,
  name: 'Full 36x6cm',
  config: {
    type: 'full',
    material: wood360x60.id,
    height: createLength(60),
    width: createLength(360),
    offsetFromEdge: createLength(30)
  }
})

// Default slab construction config
const createDefaultSlabConfigs = (): MonolithicSlabConstructionConfig[] => [
  {
    id: DEFAULT_SLAB_CONFIG_ID,
    name: 'CLT 18cm (6m)',
    type: 'monolithic',
    thickness: createLength(180),
    material: clt180.id,
    layers: {
      topThickness: createLength(60),
      bottomThickness: createLength(0)
    }
  },
  {
    id: 'scm_concrete_default' as SlabConstructionConfigId,
    name: 'Concrete 20cm (6m)',
    type: 'monolithic',
    thickness: createLength(200),
    material: concrete.id,
    layers: {
      topThickness: createLength(60),
      bottomThickness: createLength(0)
    }
  }
]

// Default perimeter construction methods
const createDefaultPerimeterMethods = (): PerimeterConstructionMethod[] => [
  {
    id: 'pwcm_infill_default' as PerimeterConstructionMethodId,
    name: 'Standard Infill',
    config: {
      type: 'infill',
      maxPostSpacing: createLength(800),
      minStrawSpace: createLength(70),
      posts: {
        type: 'double',
        width: createLength(60),
        thickness: createLength(120),
        infillMaterial: straw.id,
        material: wood120x60.id
      },
      openings: {
        padding: createLength(15),
        headerThickness: createLength(60),
        headerMaterial: wood360x60.id,
        sillThickness: createLength(60),
        sillMaterial: wood360x60.id
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: strawbale.id
      }
    },
    layers: {
      insideThickness: createLength(30),
      outsideThickness: createLength(50)
    }
  },
  {
    id: 'pwcm_strawhenge_default' as PerimeterConstructionMethodId,
    name: 'Strawhenge Module',
    config: {
      type: 'strawhenge',
      module: {
        width: createLength(920),
        type: 'single',
        frameThickness: createLength(60),
        frameMaterial: wood360x60.id,
        strawMaterial: strawbale.id
      },
      infill: {
        type: 'infill',
        maxPostSpacing: createLength(800),
        minStrawSpace: createLength(70),
        posts: {
          type: 'full',
          width: createLength(60),
          material: wood360x60.id
        },
        openings: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          sillThickness: createLength(60),
          sillMaterial: wood360x60.id
        },
        straw: {
          baleLength: createLength(800),
          baleHeight: createLength(500),
          baleWidth: createLength(360),
          material: strawbale.id
        }
      },
      openings: {
        padding: createLength(15),
        headerThickness: createLength(60),
        headerMaterial: wood360x60.id,
        sillThickness: createLength(60),
        sillMaterial: wood360x60.id
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: strawbale.id
      }
    },
    layers: {
      insideThickness: createLength(30),
      outsideThickness: createLength(50)
    }
  },
  {
    id: 'pwcm_module_default' as PerimeterConstructionMethodId,
    name: 'Default Module',
    config: {
      type: 'modules',
      module: {
        width: createLength(920),
        type: 'single',
        frameThickness: createLength(60),
        frameMaterial: wood360x60.id,
        strawMaterial: strawbale.id
      },
      infill: {
        type: 'infill',
        maxPostSpacing: createLength(800),
        minStrawSpace: createLength(70),
        posts: {
          type: 'full',
          width: createLength(60),
          material: wood360x60.id
        },
        openings: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          sillThickness: createLength(60),
          sillMaterial: wood360x60.id
        },
        straw: {
          baleLength: createLength(800),
          baleHeight: createLength(500),
          baleWidth: createLength(360),
          material: strawbale.id
        }
      },
      openings: {
        padding: createLength(15),
        headerThickness: createLength(60),
        headerMaterial: wood360x60.id,
        sillThickness: createLength(60),
        sillMaterial: wood360x60.id
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: strawbale.id
      }
    },
    layers: {
      insideThickness: createLength(30),
      outsideThickness: createLength(50)
    }
  },
  {
    id: 'pwcm_non_strawbale_default' as PerimeterConstructionMethodId,
    name: 'Non-Strawbale Wall',
    config: {
      type: 'non-strawbale',
      material: concrete.id,
      thickness: 200,
      openings: {
        padding: createLength(15),
        headerThickness: createLength(60),
        headerMaterial: wood360x60.id,
        sillThickness: createLength(60),
        sillMaterial: wood360x60.id
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: strawbale.id
      }
    },
    layers: {
      insideThickness: createLength(30),
      outsideThickness: createLength(30)
    }
  }
]

const useConfigStore = create<ConfigStore>()(
  persist(
    devtools(
      (set, get) => {
        // Initialize with default methods
        const defaultRingBeamMethod = createDefaultRingBeamMethod()
        const defaultPerimeterMethods = createDefaultPerimeterMethods()
        const defaultSlabConfigs = createDefaultSlabConfigs()

        return {
          ringBeamConstructionMethods: {
            [defaultRingBeamMethod.id]: defaultRingBeamMethod
          },
          perimeterConstructionMethods: Object.fromEntries(defaultPerimeterMethods.map(method => [method.id, method])),
          slabConstructionConfigs: Object.fromEntries(defaultSlabConfigs.map(config => [config.id, config])),
          defaultBaseRingBeamMethodId: defaultRingBeamMethod.id,
          defaultTopRingBeamMethodId: defaultRingBeamMethod.id,
          defaultPerimeterMethodId: defaultPerimeterMethods[0].id,
          defaultSlabConfigId: DEFAULT_SLAB_CONFIG_ID,

          actions: {
            // CRUD operations
            addRingBeamConstructionMethod: (name: string, config: RingBeamConfig) => {
              // Validate inputs
              validateRingBeamName(name)
              validateRingBeamConfig(config)

              const id = createRingBeamConstructionMethodId()
              const method: RingBeamConstructionMethod = {
                id,
                name: name.trim(),
                config
              }

              set(state => ({
                ...state,
                ringBeamConstructionMethods: { ...state.ringBeamConstructionMethods, [id]: method }
              }))

              return method
            },

            removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => {
              set(state => {
                const { [id]: removed, ...remainingMethods } = state.ringBeamConstructionMethods
                return {
                  ...state,
                  ringBeamConstructionMethods: remainingMethods,
                  // Clear defaults if removing the default method
                  defaultBaseRingBeamMethodId:
                    state.defaultBaseRingBeamMethodId === id ? undefined : state.defaultBaseRingBeamMethodId,
                  defaultTopRingBeamMethodId:
                    state.defaultTopRingBeamMethodId === id ? undefined : state.defaultTopRingBeamMethodId
                }
              })
            },

            updateRingBeamConstructionMethodName: (id: RingBeamConstructionMethodId, name: string) => {
              set(state => {
                const method = state.ringBeamConstructionMethods[id]
                if (method == null) return state

                validateRingBeamName(name)

                const updatedMethod: RingBeamConstructionMethod = {
                  ...method,
                  name: name.trim()
                }

                return {
                  ...state,
                  ringBeamConstructionMethods: { ...state.ringBeamConstructionMethods, [id]: updatedMethod }
                }
              })
            },

            updateRingBeamConstructionMethodConfig: (id: RingBeamConstructionMethodId, config: RingBeamConfig) => {
              set(state => {
                const method = state.ringBeamConstructionMethods[id]
                if (method == null) return state

                validateRingBeamConfig(config)

                const updatedMethod: RingBeamConstructionMethod = {
                  ...method,
                  config
                }

                return {
                  ...state,
                  ringBeamConstructionMethods: { ...state.ringBeamConstructionMethods, [id]: updatedMethod }
                }
              })
            },

            // Queries
            getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => {
              const state = get()
              return state.ringBeamConstructionMethods[id] ?? null
            },

            getAllRingBeamConstructionMethods: () => {
              const state = get()
              return Object.values(state.ringBeamConstructionMethods)
            },

            // Default ring beam management
            setDefaultBaseRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => {
              set(state => ({
                ...state,
                defaultBaseRingBeamMethodId: methodId
              }))
            },

            setDefaultTopRingBeamMethod: (methodId: RingBeamConstructionMethodId | undefined) => {
              set(state => ({
                ...state,
                defaultTopRingBeamMethodId: methodId
              }))
            },

            getDefaultBaseRingBeamMethodId: () => {
              const state = get()
              return state.defaultBaseRingBeamMethodId
            },

            getDefaultTopRingBeamMethodId: () => {
              const state = get()
              return state.defaultTopRingBeamMethodId
            },

            // Perimeter construction method CRUD operations
            addPerimeterConstructionMethod: (
              name: string,
              config: PerimeterConstructionConfig,
              layers: WallLayersConfig
            ) => {
              validatePerimeterMethodName(name)

              const id = createPerimeterConstructionMethodId()
              const method: PerimeterConstructionMethod = {
                id,
                name: name.trim(),
                config,
                layers
              }

              set(state => ({
                ...state,
                perimeterConstructionMethods: { ...state.perimeterConstructionMethods, [id]: method }
              }))

              return method
            },

            duplicatePerimeterConstructionMethod: (id: PerimeterConstructionMethodId, name: string) => {
              const state = get()
              const original = state.perimeterConstructionMethods[id]
              if (original == null) {
                throw new Error(`Perimeter construction method with id ${id} not found`)
              }

              validatePerimeterMethodName(name)

              const newId = createPerimeterConstructionMethodId()
              const duplicated: PerimeterConstructionMethod = {
                id: newId,
                name: name.trim(),
                config: original.config,
                layers: original.layers
              }

              set(state => ({
                ...state,
                perimeterConstructionMethods: { ...state.perimeterConstructionMethods, [newId]: duplicated }
              }))

              return duplicated
            },

            removePerimeterConstructionMethod: (id: PerimeterConstructionMethodId) => {
              set(state => {
                const { [id]: removed, ...remainingMethods } = state.perimeterConstructionMethods
                return {
                  ...state,
                  perimeterConstructionMethods: remainingMethods,
                  defaultPerimeterMethodId:
                    state.defaultPerimeterMethodId === id ? undefined : state.defaultPerimeterMethodId
                }
              })
            },

            updatePerimeterConstructionMethodName: (id: PerimeterConstructionMethodId, name: string) => {
              set(state => {
                const method = state.perimeterConstructionMethods[id]
                if (method == null) return state

                validatePerimeterMethodName(name)

                const updatedMethod: PerimeterConstructionMethod = {
                  ...method,
                  name: name.trim()
                }

                return {
                  ...state,
                  perimeterConstructionMethods: { ...state.perimeterConstructionMethods, [id]: updatedMethod }
                }
              })
            },

            updatePerimeterConstructionMethodConfig: (
              id: PerimeterConstructionMethodId,
              config: PerimeterConstructionConfig
            ) => {
              set(state => {
                const method = state.perimeterConstructionMethods[id]
                if (method == null) return state

                const updatedMethod: PerimeterConstructionMethod = {
                  ...method,
                  config
                }

                return {
                  ...state,
                  perimeterConstructionMethods: { ...state.perimeterConstructionMethods, [id]: updatedMethod }
                }
              })
            },

            updatePerimeterConstructionMethodLayers: (id: PerimeterConstructionMethodId, layers: WallLayersConfig) => {
              set(state => {
                const method = state.perimeterConstructionMethods[id]
                if (method == null) return state

                const updatedMethod: PerimeterConstructionMethod = {
                  ...method,
                  layers
                }

                return {
                  ...state,
                  perimeterConstructionMethods: { ...state.perimeterConstructionMethods, [id]: updatedMethod }
                }
              })
            },

            // Perimeter queries
            getPerimeterConstructionMethodById: (id: PerimeterConstructionMethodId) => {
              const state = get()
              return state.perimeterConstructionMethods[id] ?? null
            },

            getAllPerimeterConstructionMethods: () => {
              const state = get()
              return Object.values(state.perimeterConstructionMethods)
            },

            // Default perimeter method management
            setDefaultPerimeterMethod: (methodId: PerimeterConstructionMethodId | undefined) => {
              set(state => ({
                ...state,
                defaultPerimeterMethodId: methodId
              }))
            },

            getDefaultPerimeterMethodId: () => {
              const state = get()
              return state.defaultPerimeterMethodId
            },

            // Slab construction config CRUD operations
            addSlabConstructionConfig: (config: SlabConstructionConfig) => {
              validateSlabConfig(config)

              set(state => ({
                ...state,
                slabConstructionConfigs: { ...state.slabConstructionConfigs, [config.id]: config }
              }))

              return config
            },

            removeSlabConstructionConfig: (id: SlabConstructionConfigId) => {
              set(state => {
                const { slabConstructionConfigs } = state

                // Prevent removing the last config
                if (Object.keys(slabConstructionConfigs).length === 1) {
                  throw new Error('Cannot remove the last slab construction config')
                }

                const { [id]: removed, ...remainingConfigs } = slabConstructionConfigs

                // If removing the default, set first remaining config as default
                let newDefaultId = state.defaultSlabConfigId
                if (state.defaultSlabConfigId === id) {
                  newDefaultId = Object.keys(remainingConfigs)[0] as SlabConstructionConfigId
                }

                return {
                  ...state,
                  slabConstructionConfigs: remainingConfigs,
                  defaultSlabConfigId: newDefaultId
                }
              })
            },

            updateSlabConstructionConfig: (
              id: SlabConstructionConfigId,
              updates: Omit<SlabConstructionConfig, 'id'>
            ) => {
              set(state => {
                const config = state.slabConstructionConfigs[id]
                if (config == null) return state

                const updatedConfig = { ...config, ...updates, id } as SlabConstructionConfig
                validateSlabConfig(updatedConfig)

                return {
                  ...state,
                  slabConstructionConfigs: { ...state.slabConstructionConfigs, [id]: updatedConfig }
                }
              })
            },

            duplicateSlabConstructionConfig: (id: SlabConstructionConfigId, name: string) => {
              const state = get()
              const original = state.slabConstructionConfigs[id]
              if (original == null) {
                throw new Error(`Slab construction config with id ${id} not found`)
              }

              validateSlabConfigName(name)

              const newId = createSlabConstructionConfigId()
              const duplicated = { ...original, id: newId, name: name.trim() } as SlabConstructionConfig

              set(state => ({
                ...state,
                slabConstructionConfigs: { ...state.slabConstructionConfigs, [newId]: duplicated }
              }))

              return duplicated
            },

            // Slab queries
            getSlabConstructionConfigById: (id: SlabConstructionConfigId) => {
              const state = get()
              return state.slabConstructionConfigs[id] ?? null
            },

            getAllSlabConstructionConfigs: () => {
              const state = get()
              return Object.values(state.slabConstructionConfigs)
            },

            // Default slab config management
            setDefaultSlabConfig: (configId: SlabConstructionConfigId) => {
              set(state => {
                // Validate that the config exists
                if (state.slabConstructionConfigs[configId] == null) {
                  throw new Error(`Slab construction config with id ${configId} not found`)
                }

                return {
                  ...state,
                  defaultSlabConfigId: configId
                }
              })
            },

            getDefaultSlabConfigId: () => {
              const state = get()
              return state.defaultSlabConfigId
            }
          }
        }
      },
      { name: 'config-store' }
    ),
    {
      name: 'strawbaler-config',
      partialize: state => ({
        ringBeamConstructionMethods: state.ringBeamConstructionMethods,
        perimeterConstructionMethods: state.perimeterConstructionMethods,
        slabConstructionConfigs: state.slabConstructionConfigs,
        defaultBaseRingBeamMethodId: state.defaultBaseRingBeamMethodId,
        defaultTopRingBeamMethodId: state.defaultTopRingBeamMethodId,
        defaultPerimeterMethodId: state.defaultPerimeterMethodId,
        defaultSlabConfigId: state.defaultSlabConfigId
      })
    }
  )
)

// Selector hooks for easier usage
export const useRingBeamConstructionMethods = (): RingBeamConstructionMethod[] => {
  const ringBeamMethods = useConfigStore(state => state.ringBeamConstructionMethods)
  return useMemo(() => Object.values(ringBeamMethods), [ringBeamMethods])
}

export const useRingBeamConstructionMethodById = (
  id: RingBeamConstructionMethodId
): RingBeamConstructionMethod | null => useConfigStore(state => state.actions.getRingBeamConstructionMethodById(id))

export const useDefaultBaseRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.actions.getDefaultBaseRingBeamMethodId())

export const useDefaultTopRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.actions.getDefaultTopRingBeamMethodId())

// Perimeter construction method selector hooks
export const usePerimeterConstructionMethods = (): PerimeterConstructionMethod[] => {
  const perimeterMethods = useConfigStore(state => state.perimeterConstructionMethods)
  return useMemo(() => Object.values(perimeterMethods), [perimeterMethods])
}

export const usePerimeterConstructionMethodById = (
  id: PerimeterConstructionMethodId
): PerimeterConstructionMethod | null => useConfigStore(state => state.actions.getPerimeterConstructionMethodById(id))

export const useDefaultPerimeterMethodId = (): PerimeterConstructionMethodId | undefined =>
  useConfigStore(state => state.actions.getDefaultPerimeterMethodId())

// Slab construction config selector hooks
export const useSlabConstructionConfigs = (): SlabConstructionConfig[] => {
  const slabConfigs = useConfigStore(state => state.slabConstructionConfigs)
  return useMemo(() => Object.values(slabConfigs), [slabConfigs])
}

export const useSlabConstructionConfigById = (id: SlabConstructionConfigId): SlabConstructionConfig | null =>
  useConfigStore(state => state.actions.getSlabConstructionConfigById(id))

export const useDefaultSlabConfigId = (): SlabConstructionConfigId =>
  useConfigStore(state => state.actions.getDefaultSlabConfigId())

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)

// For non-reactive contexts
export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    ringBeamConstructionMethods: state.ringBeamConstructionMethods,
    perimeterConstructionMethods: state.perimeterConstructionMethods,
    slabConstructionConfigs: state.slabConstructionConfigs,
    defaultBaseRingBeamMethodId: state.defaultBaseRingBeamMethodId,
    defaultTopRingBeamMethodId: state.defaultTopRingBeamMethodId,
    defaultPerimeterMethodId: state.defaultPerimeterMethodId,
    defaultSlabConfigId: state.defaultSlabConfigId
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
  slabConstructionConfigs?: Record<SlabConstructionConfigId, SlabConstructionConfig>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
  defaultPerimeterMethodId: PerimeterConstructionMethodId
  defaultSlabConfigId?: SlabConstructionConfigId
}) => {
  const state = useConfigStore.getState()

  useConfigStore.setState({
    ringBeamConstructionMethods: data.ringBeamConstructionMethods,
    perimeterConstructionMethods: data.perimeterConstructionMethods,
    slabConstructionConfigs: data.slabConstructionConfigs ?? state.slabConstructionConfigs,
    defaultBaseRingBeamMethodId: data.defaultBaseRingBeamMethodId,
    defaultTopRingBeamMethodId: data.defaultTopRingBeamMethodId,
    defaultPerimeterMethodId: data.defaultPerimeterMethodId,
    defaultSlabConfigId: data.defaultSlabConfigId ?? state.defaultSlabConfigId
  })
}

// Only for the tests
export const _clearAllMethods = () =>
  useConfigStore.setState({
    ringBeamConstructionMethods: {},
    perimeterConstructionMethods: {},
    slabConstructionConfigs: {}
  })
