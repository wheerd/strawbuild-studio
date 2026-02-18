import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

import type {
  DimensionalMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from './material'
import { DEFAULT_MATERIALS, createMaterialId } from './material'
import { MATERIALS_STORE_VERSION, migrateMaterialsState } from './store/migrations'

export interface MaterialsState {
  materials: Record<MaterialId, Material>
  timestamps: Record<MaterialId, number>
}

type UnionOmit<T, K extends string | number | symbol> = T extends unknown ? Omit<T, K> : never

export interface MaterialsActions {
  // CRUD operations
  addMaterial: (material: UnionOmit<Material, 'id'>) => Material
  removeMaterial: (id: MaterialId) => void
  updateMaterial: (id: MaterialId, updates: Partial<UnionOmit<Material, 'id' | 'type'>>) => void
  duplicateMaterial: (id: MaterialId, newName: string) => Material

  // Queries
  getMaterialById: (id: MaterialId) => Material | null
  getAllMaterials: () => Material[]
  getMaterialsByType: (type: Material['type']) => Material[]

  // Timestamps
  getTimestamp: (id: MaterialId) => number | null
  clearAllTimestamps: () => void

  reset(this: void): void
}

export type MaterialsStore = MaterialsState & { actions: MaterialsActions }

// Validation functions
const validateMaterialName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Material name cannot be empty')
  }
}

const validateMaterialUpdates = (updates: Partial<UnionOmit<Material, 'id'>>, materialType: Material['type']): void => {
  if (updates.name !== undefined) {
    validateMaterialName(updates.name)
  }

  if (updates.density !== undefined && updates.density <= 0) {
    throw new Error('Density must be positive numbers')
  }

  switch (materialType) {
    case 'dimensional': {
      const dimensional = updates as Partial<DimensionalMaterial>
      if (dimensional.crossSections !== undefined) {
        dimensional.crossSections.forEach(section => {
          if (
            typeof section.smallerLength !== 'number' ||
            typeof section.biggerLength !== 'number' ||
            section.smallerLength <= 0 ||
            section.biggerLength <= 0
          ) {
            throw new Error('Cross section dimensions must be positive numbers')
          }
        })
      }

      if (dimensional.lengths !== undefined) {
        if (dimensional.lengths.some(length => length <= 0)) {
          throw new Error('All lengths must be positive')
        }
      }
      break
    }
    case 'sheet': {
      const sheet = updates as Partial<SheetMaterial>
      if (sheet.sizes != null) {
        sheet.sizes.forEach(size => {
          if (
            typeof size.smallerLength !== 'number' ||
            typeof size.biggerLength !== 'number' ||
            size.smallerLength <= 0 ||
            size.biggerLength <= 0
          ) {
            throw new Error('Sheet size dimensions must be positive numbers')
          }
        })
      }

      if (sheet.thicknesses != null) {
        if (sheet.thicknesses.some(thickness => thickness <= 0)) {
          throw new Error('All sheet thicknesses must be positive')
        }
      }
      break
    }
    case 'volume': {
      const volumeMaterial = updates as Partial<VolumeMaterial>
      if (volumeMaterial.availableVolumes !== undefined) {
        if (volumeMaterial.availableVolumes.some(volume => volume <= 0)) {
          throw new Error('All available volumes must be positive')
        }
      }
      break
    }
    case 'strawbale': {
      const strawMaterial = updates as Partial<StrawbaleMaterial>
      if (strawMaterial.baleMinLength !== undefined && strawMaterial.baleMinLength <= 0) {
        throw new Error('Bale minimum length must be positive')
      }
      if (strawMaterial.baleMaxLength !== undefined && strawMaterial.baleMaxLength <= 0) {
        throw new Error('Bale maximum length must be positive')
      }
      if (
        strawMaterial.baleMinLength !== undefined &&
        strawMaterial.baleMaxLength !== undefined &&
        strawMaterial.baleMinLength > strawMaterial.baleMaxLength
      ) {
        throw new Error('Bale minimum length cannot exceed the maximum length')
      }
      if (strawMaterial.baleHeight !== undefined && strawMaterial.baleHeight <= 0) {
        throw new Error('Bale height must be positive')
      }
      if (strawMaterial.baleWidth !== undefined && strawMaterial.baleWidth <= 0) {
        throw new Error('Bale width must be positive')
      }
      if (strawMaterial.tolerance !== undefined && strawMaterial.tolerance < 0) {
        throw new Error('Bale tolerance cannot be negative')
      }
      if (strawMaterial.topCutoffLimit !== undefined && strawMaterial.topCutoffLimit <= 0) {
        throw new Error('Top cutoff limit must be positive')
      }
      if (strawMaterial.flakeSize !== undefined && strawMaterial.flakeSize <= 0) {
        throw new Error('Flake size must be positive')
      }
      break
    }
    case 'generic':
    default:
      break
  }
}

const useMaterialsStore = create<MaterialsStore>()(
  subscribeWithSelector(
    persist(
      devtools(
        (set, get, store) => ({
          // Initialize with default materials
          materials: { ...DEFAULT_MATERIALS },
          timestamps: Object.fromEntries(Object.entries(DEFAULT_MATERIALS).map(([id]) => [id, Date.now()])),

          actions: {
            addMaterial: (materialData: UnionOmit<Material, 'id' | 'updatedAt'>) => {
              validateMaterialName(materialData.name)
              validateMaterialUpdates(materialData, materialData.type)

              const id = createMaterialId()
              const material: Material = {
                ...materialData,
                id
              } as Material

              set(state => ({
                ...state,
                materials: { ...state.materials, [id]: material },
                timestamps: { ...state.timestamps, [id]: Date.now() }
              }))

              return material
            },

            removeMaterial: (id: MaterialId) => {
              set(state => {
                const { [id]: _removed, ...remainingMaterials } = state.materials
                const { [id]: _timestampRemoved, ...remainingTimestamps } = state.timestamps
                return {
                  ...state,
                  materials: remainingMaterials,
                  timestamps: remainingTimestamps
                }
              })
            },

            updateMaterial: (id: MaterialId, updates: Partial<UnionOmit<Material, 'id' | 'type' | 'updatedAt'>>) => {
              set(state => {
                if (!(id in state.materials)) return state
                const material = state.materials[id]

                validateMaterialUpdates(updates, material.type)

                // Check for name uniqueness (excluding current material)
                if (updates.name !== undefined) {
                  const nameExists = Object.values(state.materials).some(
                    mat => mat.id !== id && mat.name.trim().toLowerCase() === updates.name?.trim().toLowerCase()
                  )
                  if (nameExists) {
                    throw new Error('A material with this name already exists')
                  }
                }

                const updatedMaterial: Material = {
                  ...material,
                  ...updates,
                  name: updates.name?.trim() ?? material.name,
                  // Clear nameKey if user is editing the name (indicates custom name)
                  nameKey: updates.name !== undefined ? undefined : material.nameKey
                }

                return {
                  ...state,
                  materials: { ...state.materials, [id]: updatedMaterial },
                  timestamps: { ...state.timestamps, [id]: Date.now() }
                }
              })
            },

            duplicateMaterial: (id: MaterialId, newName: string) => {
              const state = get()
              if (!(id in state.materials)) throw new Error('Material not found')
              const originalMaterial = state.materials[id]

              validateMaterialName(newName)

              // Check for name uniqueness
              const nameExists = Object.values(state.materials).some(
                mat => mat.name.trim().toLowerCase() === newName.trim().toLowerCase()
              )
              if (nameExists) {
                throw new Error('A material with this name already exists')
              }

              const newId = createMaterialId()
              const duplicatedMaterial: Material = {
                ...originalMaterial,
                id: newId,
                name: newName.trim()
              }

              set(state => ({
                ...state,
                materials: { ...state.materials, [newId]: duplicatedMaterial },
                timestamps: { ...state.timestamps, [newId]: Date.now() }
              }))

              return duplicatedMaterial
            },

            // Queries
            getMaterialById: (id: MaterialId) => {
              const state = get()
              return state.materials[id] ?? null
            },

            getAllMaterials: () => {
              const state = get()
              return Object.values(state.materials)
            },

            getMaterialsByType: (type: Material['type']) => {
              const state = get()
              return Object.values(state.materials).filter(material => material.type === type)
            },

            reset: () => {
              set(store.getInitialState())
            },

            // Timestamps
            getTimestamp: (id: MaterialId) => {
              const state = get()
              return state.timestamps[id] ?? null
            },

            clearAllTimestamps: () => {
              set(state => ({
                ...state,
                timestamps: {}
              }))
            }
          }
        }),
        { name: 'materials-store' }
      ),
      {
        name: 'strawbaler-materials',
        version: MATERIALS_STORE_VERSION,
        partialize: state => ({
          materials: state.materials,
          timestamps: state.timestamps
        }),
        migrate: migrateMaterialsState
      }
    )
  )
)

// Selector hooks for easier usage
export const useMaterials = (): Material[] => {
  const materials = useMaterialsStore(state => state.materials)
  return useMemo(() => Object.values(materials), [materials])
}

export const useMaterialById = (id: MaterialId): Material | null =>
  useMaterialsStore(state => state.actions.getMaterialById(id))

export const useMaterialsMap = (): Record<MaterialId, Material> => {
  const materials = useMaterialsStore(state => state.materials)
  return useMemo(() => ({ ...materials }), [materials])
}

export const useMaterialsByType = (type: Material['type']): Material[] => {
  const materials = useMaterialsStore(state => state.materials)
  return useMemo(() => Object.values(materials).filter(material => material.type === type), [materials, type])
}

export const useMaterialActions = (): MaterialsActions => useMaterialsStore(state => state.actions)

// For non-reactive contexts
export const getMaterialsActions = (): MaterialsActions => useMaterialsStore.getState().actions

export const getInitialMaterialsState = (): MaterialsState => {
  const state = useMaterialsStore.getInitialState()
  return {
    materials: state.materials,
    timestamps: state.timestamps
  }
}

// Export materials state for persistence/debugging
export const getMaterialsState = (): MaterialsState => {
  const state = useMaterialsStore.getState()
  return {
    materials: state.materials,
    timestamps: state.timestamps
  }
}

// Import materials state from persistence
export const setMaterialsState = (data: {
  materials: Record<MaterialId, Material>
  timestamps?: Record<MaterialId, number>
}) => {
  useMaterialsStore.setState(
    {
      materials: data.materials,
      timestamps: data.timestamps ?? {}
    },
    false
  )
}

export function hydrateMaterialsState(state: unknown, version: number): MaterialsState {
  const migratedState = migrateMaterialsState(state, version)
  useMaterialsStore.setState(migratedState)
  return migratedState
}

// For non-reactive material resolution in construction functions
export const getMaterialById = (id: MaterialId): Material | null => {
  const state = useMaterialsStore.getState()
  return state.materials[id] ?? null
}

// For getting all materials (CSS generation, etc.)
export const getAllMaterials = (): Material[] => {
  const state = useMaterialsStore.getState()
  return Object.values(state.materials)
}

// Subscribe to materials changes (for CSS re-injection, etc.)
export const subscribeToMaterials = (callback: (materials: Material[]) => void) => {
  return useMaterialsStore.subscribe(state => {
    callback(Object.values(state.materials))
  })
}

// Only for tests
export const _clearAllMaterials = () => useMaterialsStore.setState({ materials: {} })
