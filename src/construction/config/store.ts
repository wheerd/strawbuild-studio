import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type {
  FloorConstructionConfigId,
  PerimeterConstructionMethodId,
  RingBeamConstructionMethodId
} from '@/building/model/ids'
import {
  createFloorConstructionConfigId,
  createPerimeterConstructionMethodId,
  createRingBeamConstructionMethodId
} from '@/building/model/ids'
import type {
  CltConstructionConfig,
  FloorConstructionConfig,
  PerimeterConstructionConfig,
  PerimeterConstructionMethod,
  RingBeamConstructionMethod,
  WallLayersConfig
} from '@/construction/config/types'
import { clt180, concrete, straw, strawbale, wood120x60, wood360x60 } from '@/construction/materials/material'
import { type RingBeamConfig, validateRingBeamConfig } from '@/construction/ringBeams/ringBeams'
import { createLength } from '@/shared/geometry'

export interface ConfigState {
  ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
  floorConstructionConfigs: Record<FloorConstructionConfigId, FloorConstructionConfig>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
  defaultPerimeterMethodId: PerimeterConstructionMethodId
  defaultFloorConfigId: FloorConstructionConfigId
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

  // CRUD operations for floor construction configs
  addFloorConstructionConfig: (config: FloorConstructionConfig) => FloorConstructionConfig
  removeFloorConstructionConfig: (id: FloorConstructionConfigId) => void
  updateFloorConstructionConfig: (id: FloorConstructionConfigId, config: Omit<FloorConstructionConfig, 'id'>) => void
  duplicateFloorConstructionConfig: (id: FloorConstructionConfigId, name: string) => FloorConstructionConfig

  // Floor queries
  getFloorConstructionConfigById: (id: FloorConstructionConfigId) => FloorConstructionConfig | null
  getAllFloorConstructionConfigs: () => FloorConstructionConfig[]

  // Default floor config management
  setDefaultFloorConfig: (configId: FloorConstructionConfigId) => void
  getDefaultFloorConfigId: () => FloorConstructionConfigId
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

const validateFloorConfigName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Floor construction config name cannot be empty')
  }
}

const validateFloorConfig = (config: FloorConstructionConfig): void => {
  validateFloorConfigName(config.name)

  if (config.type === 'clt') {
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

// Default floor construction config
const createDefaultFloorConfig = (): CltConstructionConfig => ({
  id: 'fcm_default' as FloorConstructionConfigId,
  name: 'CLT 18cm',
  type: 'clt',
  thickness: createLength(180),
  material: clt180.id,
  layers: {
    topThickness: createLength(0),
    bottomThickness: createLength(0)
  }
})

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
        const defaultFloorConfig = createDefaultFloorConfig()

        return {
          ringBeamConstructionMethods: {
            [defaultRingBeamMethod.id]: defaultRingBeamMethod
          },
          perimeterConstructionMethods: Object.fromEntries(defaultPerimeterMethods.map(method => [method.id, method])),
          floorConstructionConfigs: {
            [defaultFloorConfig.id]: defaultFloorConfig
          },
          defaultBaseRingBeamMethodId: defaultRingBeamMethod.id,
          defaultTopRingBeamMethodId: defaultRingBeamMethod.id,
          defaultPerimeterMethodId: defaultPerimeterMethods[0].id,
          defaultFloorConfigId: defaultFloorConfig.id,

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

            // Floor construction config CRUD operations
            addFloorConstructionConfig: (config: FloorConstructionConfig) => {
              validateFloorConfig(config)

              set(state => ({
                ...state,
                floorConstructionConfigs: { ...state.floorConstructionConfigs, [config.id]: config }
              }))

              return config
            },

            removeFloorConstructionConfig: (id: FloorConstructionConfigId) => {
              set(state => {
                const { floorConstructionConfigs } = state

                // Prevent removing the last config
                if (Object.keys(floorConstructionConfigs).length === 1) {
                  throw new Error('Cannot remove the last floor construction config')
                }

                const { [id]: removed, ...remainingConfigs } = floorConstructionConfigs

                // If removing the default, set first remaining config as default
                let newDefaultId = state.defaultFloorConfigId
                if (state.defaultFloorConfigId === id) {
                  newDefaultId = Object.keys(remainingConfigs)[0] as FloorConstructionConfigId
                }

                return {
                  ...state,
                  floorConstructionConfigs: remainingConfigs,
                  defaultFloorConfigId: newDefaultId
                }
              })
            },

            updateFloorConstructionConfig: (
              id: FloorConstructionConfigId,
              updates: Omit<FloorConstructionConfig, 'id'>
            ) => {
              set(state => {
                const config = state.floorConstructionConfigs[id]
                if (config == null) return state

                const updatedConfig = { ...config, ...updates, id } as FloorConstructionConfig
                validateFloorConfig(updatedConfig)

                return {
                  ...state,
                  floorConstructionConfigs: { ...state.floorConstructionConfigs, [id]: updatedConfig }
                }
              })
            },

            duplicateFloorConstructionConfig: (id: FloorConstructionConfigId, name: string) => {
              const state = get()
              const original = state.floorConstructionConfigs[id]
              if (original == null) {
                throw new Error(`Floor construction config with id ${id} not found`)
              }

              validateFloorConfigName(name)

              const newId = createFloorConstructionConfigId()
              const duplicated = { ...original, id: newId, name: name.trim() } as FloorConstructionConfig

              set(state => ({
                ...state,
                floorConstructionConfigs: { ...state.floorConstructionConfigs, [newId]: duplicated }
              }))

              return duplicated
            },

            // Floor queries
            getFloorConstructionConfigById: (id: FloorConstructionConfigId) => {
              const state = get()
              return state.floorConstructionConfigs[id] ?? null
            },

            getAllFloorConstructionConfigs: () => {
              const state = get()
              return Object.values(state.floorConstructionConfigs)
            },

            // Default floor config management
            setDefaultFloorConfig: (configId: FloorConstructionConfigId) => {
              set(state => {
                // Validate that the config exists
                if (state.floorConstructionConfigs[configId] == null) {
                  throw new Error(`Floor construction config with id ${configId} not found`)
                }

                return {
                  ...state,
                  defaultFloorConfigId: configId
                }
              })
            },

            getDefaultFloorConfigId: () => {
              const state = get()
              return state.defaultFloorConfigId
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
        floorConstructionConfigs: state.floorConstructionConfigs,
        defaultBaseRingBeamMethodId: state.defaultBaseRingBeamMethodId,
        defaultTopRingBeamMethodId: state.defaultTopRingBeamMethodId,
        defaultPerimeterMethodId: state.defaultPerimeterMethodId,
        defaultFloorConfigId: state.defaultFloorConfigId
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

// Floor construction config selector hooks
export const useFloorConstructionConfigs = (): FloorConstructionConfig[] => {
  const floorConfigs = useConfigStore(state => state.floorConstructionConfigs)
  return useMemo(() => Object.values(floorConfigs), [floorConfigs])
}

export const useFloorConstructionConfigById = (id: FloorConstructionConfigId): FloorConstructionConfig | null =>
  useConfigStore(state => state.actions.getFloorConstructionConfigById(id))

export const useDefaultFloorConfigId = (): FloorConstructionConfigId =>
  useConfigStore(state => state.actions.getDefaultFloorConfigId())

export const useConfigActions = (): ConfigActions => useConfigStore(state => state.actions)

// For non-reactive contexts
export const getConfigActions = (): ConfigActions => useConfigStore.getState().actions

// Export config state for persistence
export const getConfigState = () => {
  const state = useConfigStore.getState()
  return {
    ringBeamConstructionMethods: state.ringBeamConstructionMethods,
    perimeterConstructionMethods: state.perimeterConstructionMethods,
    floorConstructionConfigs: state.floorConstructionConfigs,
    defaultBaseRingBeamMethodId: state.defaultBaseRingBeamMethodId,
    defaultTopRingBeamMethodId: state.defaultTopRingBeamMethodId,
    defaultPerimeterMethodId: state.defaultPerimeterMethodId,
    defaultFloorConfigId: state.defaultFloorConfigId
  }
}

// Import config state from persistence
export const setConfigState = (data: {
  ringBeamConstructionMethods: Record<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  perimeterConstructionMethods: Record<PerimeterConstructionMethodId, PerimeterConstructionMethod>
  floorConstructionConfigs?: Record<FloorConstructionConfigId, FloorConstructionConfig>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
  defaultPerimeterMethodId: PerimeterConstructionMethodId
  defaultFloorConfigId?: FloorConstructionConfigId
}) => {
  const state = useConfigStore.getState()

  useConfigStore.setState({
    ringBeamConstructionMethods: data.ringBeamConstructionMethods,
    perimeterConstructionMethods: data.perimeterConstructionMethods,
    floorConstructionConfigs: data.floorConstructionConfigs ?? state.floorConstructionConfigs,
    defaultBaseRingBeamMethodId: data.defaultBaseRingBeamMethodId,
    defaultTopRingBeamMethodId: data.defaultTopRingBeamMethodId,
    defaultPerimeterMethodId: data.defaultPerimeterMethodId,
    defaultFloorConfigId: data.defaultFloorConfigId ?? state.defaultFloorConfigId
  })
}

// Only for the tests
export const _clearAllMethods = () =>
  useConfigStore.setState({
    ringBeamConstructionMethods: {},
    perimeterConstructionMethods: {},
    floorConstructionConfigs: {}
  })
