import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

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

  reset(): void
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

  switch (materialType) {
    case 'dimensional': {
      const dimensional = updates as Partial<DimensionalMaterial>
      if (dimensional.crossSections !== undefined) {
        dimensional.crossSections.forEach(section => {
          if (
            section == null ||
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
      if (sheet.sizes !== undefined) {
        sheet.sizes.forEach(size => {
          if (
            size == null ||
            typeof size.smallerLength !== 'number' ||
            typeof size.biggerLength !== 'number' ||
            size.smallerLength <= 0 ||
            size.biggerLength <= 0
          ) {
            throw new Error('Sheet size dimensions must be positive numbers')
          }
        })
      }

      if (sheet.thicknesses !== undefined) {
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
  persist(
    devtools(
      (set, get, store) => ({
        // Initialize with default materials
        materials: { ...DEFAULT_MATERIALS },

        actions: {
          addMaterial: (materialData: UnionOmit<Material, 'id'>) => {
            validateMaterialName(materialData.name)
            validateMaterialUpdates(materialData, materialData.type)

            const id = createMaterialId()
            const material: Material = {
              ...materialData,
              id
            } as Material

            set(state => ({
              ...state,
              materials: { ...state.materials, [id]: material }
            }))

            return material
          },

          removeMaterial: (id: MaterialId) => {
            set(state => {
              const { [id]: _removed, ...remainingMaterials } = state.materials
              return {
                ...state,
                materials: remainingMaterials
              }
            })
          },

          updateMaterial: (id: MaterialId, updates: Partial<UnionOmit<Material, 'id' | 'type'>>) => {
            set(state => {
              const material = state.materials[id]
              if (material == null) return state

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
                name: updates.name?.trim() ?? material.name
              }

              return {
                ...state,
                materials: { ...state.materials, [id]: updatedMaterial }
              }
            })
          },

          duplicateMaterial: (id: MaterialId, newName: string) => {
            const state = get()
            const originalMaterial = state.materials[id]
            if (originalMaterial == null) {
              throw new Error('Material not found')
            }

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
              materials: { ...state.materials, [newId]: duplicatedMaterial }
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
          }
        }
      }),
      { name: 'materials-store' }
    ),
    {
      name: 'strawbaler-materials',
      version: MATERIALS_STORE_VERSION,
      partialize: state => ({
        materials: state.materials
      }),
      migrate: migrateMaterialsState
    }
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

// Export materials state for persistence/debugging
export const getMaterialsState = () => {
  const state = useMaterialsStore.getState()
  return {
    materials: state.materials
  }
}

// Import materials state from persistence
export const setMaterialsState = (data: { materials: Record<MaterialId, Material> }) => {
  useMaterialsStore.setState({
    materials: data.materials
  })
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
