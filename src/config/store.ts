import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import type {
  RingBeamConstructionMethod,
  PerimeterConstructionMethod,
  PerimeterConstructionConfig,
  LayersConfig
} from '@/types/config'
import type { RingBeamConstructionMethodId, PerimeterConstructionMethodId } from '@/types/ids'
import { createRingBeamConstructionMethodId, createPerimeterConstructionMethodId } from '@/types/ids'
import type { RingBeamConfig } from '@/construction'
import { wood360x60, validateRingBeamConfig, strawbale, door, window as windowOpening } from '@/construction'
import { createLength } from '@/types/geometry'

export interface ConfigState {
  ringBeamConstructionMethods: Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>
  perimeterConstructionMethods: Map<PerimeterConstructionMethodId, PerimeterConstructionMethod>
  defaultBaseRingBeamMethodId?: RingBeamConstructionMethodId
  defaultTopRingBeamMethodId?: RingBeamConstructionMethodId
  defaultPerimeterMethodId: PerimeterConstructionMethodId
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
  addPerimeterConstructionMethod: (name: string, config: PerimeterConstructionConfig) => PerimeterConstructionMethod
  removePerimeterConstructionMethod: (id: PerimeterConstructionMethodId) => void
  updatePerimeterConstructionMethodName: (id: PerimeterConstructionMethodId, name: string) => void
  updatePerimeterConstructionMethodConfig: (
    id: PerimeterConstructionMethodId,
    config: PerimeterConstructionConfig
  ) => void

  // Perimeter queries
  getPerimeterConstructionMethodById: (id: PerimeterConstructionMethodId) => PerimeterConstructionMethod | null
  getAllPerimeterConstructionMethods: () => PerimeterConstructionMethod[]

  // Default perimeter method management
  setDefaultPerimeterMethod: (methodId: PerimeterConstructionMethodId | undefined) => void
  getDefaultPerimeterMethodId: () => PerimeterConstructionMethodId
}

export type ConfigStore = ConfigState & ConfigActions

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
        type: 'full',
        width: createLength(60),
        material: wood360x60.id
      },
      openings: {
        door: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          fillingMaterial: door.id,
          fillingThickness: createLength(50)
        },
        window: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          sillThickness: createLength(60),
          sillMaterial: wood360x60.id,
          fillingMaterial: windowOpening.id,
          fillingThickness: createLength(30)
        },
        passage: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id
        }
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
        frame: {
          type: 'full',
          width: createLength(60),
          material: wood360x60.id
        },
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
          door: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: wood360x60.id,
            fillingMaterial: door.id,
            fillingThickness: createLength(50)
          },
          window: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: wood360x60.id,
            sillThickness: createLength(60),
            sillMaterial: wood360x60.id,
            fillingMaterial: windowOpening.id,
            fillingThickness: createLength(30)
          },
          passage: {
            padding: createLength(15),
            headerThickness: createLength(60),
            headerMaterial: wood360x60.id
          }
        },
        straw: {
          baleLength: createLength(800),
          baleHeight: createLength(500),
          baleWidth: createLength(360),
          material: strawbale.id
        }
      },
      openings: {
        door: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          fillingMaterial: door.id,
          fillingThickness: createLength(50)
        },
        window: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          sillThickness: createLength(60),
          sillMaterial: wood360x60.id,
          fillingMaterial: windowOpening.id,
          fillingThickness: createLength(30)
        },
        passage: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id
        }
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
      material: wood360x60.id,
      thickness: 200,
      openings: {
        door: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          fillingMaterial: door.id,
          fillingThickness: createLength(50)
        },
        window: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id,
          sillThickness: createLength(60),
          sillMaterial: wood360x60.id,
          fillingMaterial: windowOpening.id,
          fillingThickness: createLength(30)
        },
        passage: {
          padding: createLength(15),
          headerThickness: createLength(60),
          headerMaterial: wood360x60.id
        }
      },
      straw: {
        baleLength: createLength(800),
        baleHeight: createLength(500),
        baleWidth: createLength(360),
        material: strawbale.id
      }
    },
    layers: {
      insideThickness: createLength(0),
      outsideThickness: createLength(0)
    }
  }
]

export const useConfigStore = create<ConfigStore>()(
  devtools(
    (set, get) => {
      // Initialize with default methods
      const defaultRingBeamMethod = createDefaultRingBeamMethod()
      const defaultPerimeterMethods = createDefaultPerimeterMethods()

      return {
        ringBeamConstructionMethods: new Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>([
          [defaultRingBeamMethod.id, defaultRingBeamMethod]
        ]),
        perimeterConstructionMethods: new Map<PerimeterConstructionMethodId, PerimeterConstructionMethod>(
          defaultPerimeterMethods.map(method => [method.id, method])
        ),
        defaultBaseRingBeamMethodId: defaultRingBeamMethod.id,
        defaultTopRingBeamMethodId: defaultRingBeamMethod.id,
        defaultPerimeterMethodId: defaultPerimeterMethods[0].id,

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
            ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, method)
          }))

          return method
        },

        removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => {
          set(state => {
            const newMethods = new Map(state.ringBeamConstructionMethods)
            newMethods.delete(id)
            return {
              ...state,
              ringBeamConstructionMethods: newMethods,
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
            const method = state.ringBeamConstructionMethods.get(id)
            if (method == null) return state

            validateRingBeamName(name)

            const updatedMethod: RingBeamConstructionMethod = {
              ...method,
              name: name.trim()
            }

            return {
              ...state,
              ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        updateRingBeamConstructionMethodConfig: (id: RingBeamConstructionMethodId, config: RingBeamConfig) => {
          set(state => {
            const method = state.ringBeamConstructionMethods.get(id)
            if (method == null) return state

            validateRingBeamConfig(config)

            const updatedMethod: RingBeamConstructionMethod = {
              ...method,
              config
            }

            return {
              ...state,
              ringBeamConstructionMethods: new Map(state.ringBeamConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        // Queries
        getRingBeamConstructionMethodById: (id: RingBeamConstructionMethodId) => {
          const state = get()
          return state.ringBeamConstructionMethods.get(id) ?? null
        },

        getAllRingBeamConstructionMethods: () => {
          const state = get()
          return Array.from(state.ringBeamConstructionMethods.values())
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
        addPerimeterConstructionMethod: (name: string, config: PerimeterConstructionConfig, layers: LayersConfig) => {
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
            perimeterConstructionMethods: new Map(state.perimeterConstructionMethods).set(id, method)
          }))

          return method
        },

        removePerimeterConstructionMethod: (id: PerimeterConstructionMethodId) => {
          set(state => {
            const newMethods = new Map(state.perimeterConstructionMethods)
            newMethods.delete(id)
            return {
              ...state,
              perimeterConstructionMethods: newMethods,
              defaultPerimeterMethodId:
                state.defaultPerimeterMethodId === id ? undefined : state.defaultPerimeterMethodId
            }
          })
        },

        updatePerimeterConstructionMethodName: (id: PerimeterConstructionMethodId, name: string) => {
          set(state => {
            const method = state.perimeterConstructionMethods.get(id)
            if (method == null) return state

            validatePerimeterMethodName(name)

            const updatedMethod: PerimeterConstructionMethod = {
              ...method,
              name: name.trim()
            }

            return {
              ...state,
              perimeterConstructionMethods: new Map(state.perimeterConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        updatePerimeterConstructionMethodConfig: (
          id: PerimeterConstructionMethodId,
          config: PerimeterConstructionConfig
        ) => {
          set(state => {
            const method = state.perimeterConstructionMethods.get(id)
            if (method == null) return state

            const updatedMethod: PerimeterConstructionMethod = {
              ...method,
              config
            }

            return {
              ...state,
              perimeterConstructionMethods: new Map(state.perimeterConstructionMethods).set(id, updatedMethod)
            }
          })
        },

        // Perimeter queries
        getPerimeterConstructionMethodById: (id: PerimeterConstructionMethodId) => {
          const state = get()
          return state.perimeterConstructionMethods.get(id) ?? null
        },

        getAllPerimeterConstructionMethods: () => {
          const state = get()
          return Array.from(state.perimeterConstructionMethods.values())
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
        }
      }
    },
    { name: 'config-store' }
  )
)

// Selector hooks for easier usage
export const useRingBeamConstructionMethods = (): RingBeamConstructionMethod[] => {
  const ringBeamMethodsMap = useConfigStore(state => state.ringBeamConstructionMethods)
  return useMemo(() => Array.from(ringBeamMethodsMap.values()), [ringBeamMethodsMap])
}

export const useRingBeamConstructionMethodById = (
  id: RingBeamConstructionMethodId
): RingBeamConstructionMethod | null => useConfigStore(state => state.getRingBeamConstructionMethodById(id))

export const useDefaultBaseRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.getDefaultBaseRingBeamMethodId())

export const useDefaultTopRingBeamMethodId = (): RingBeamConstructionMethodId | undefined =>
  useConfigStore(state => state.getDefaultTopRingBeamMethodId())

// Perimeter construction method selector hooks
export const usePerimeterConstructionMethods = (): PerimeterConstructionMethod[] => {
  const perimeterMethodsMap = useConfigStore(state => state.perimeterConstructionMethods)
  return useMemo(() => Array.from(perimeterMethodsMap.values()), [perimeterMethodsMap])
}

export const usePerimeterConstructionMethodById = (
  id: PerimeterConstructionMethodId
): PerimeterConstructionMethod | null => useConfigStore(state => state.getPerimeterConstructionMethodById(id))

export const useDefaultPerimeterMethodId = (): PerimeterConstructionMethodId | undefined =>
  useConfigStore(state => state.getDefaultPerimeterMethodId())
