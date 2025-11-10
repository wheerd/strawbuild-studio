import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { Material, MaterialId } from './material'
import { DEFAULT_MATERIALS, createMaterialId } from './material'
import { MATERIALS_STORE_VERSION, migrateMaterialsState } from './store/migrations'

export interface MaterialsState {
  materials: Record<MaterialId, Material>
}

export interface MaterialsActions {
  // CRUD operations
  addMaterial: (material: Omit<Material, 'id'>) => Material
  removeMaterial: (id: MaterialId) => void
  updateMaterial: (id: MaterialId, updates: Partial<Omit<Material, 'id' | 'type'>>) => void
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

const validateMaterialUpdates = (updates: Partial<Omit<Material, 'id' | 'type'>>): void => {
  if (updates.name !== undefined) {
    validateMaterialName(updates.name)
  }

  if ('crossSections' in updates && updates.crossSections !== undefined) {
    if (!Array.isArray(updates.crossSections) || updates.crossSections.length === 0) {
      throw new Error('Cross sections must be a non-empty array')
    }
    updates.crossSections.forEach(section => {
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

  if ('lengths' in updates && updates.lengths !== undefined) {
    if (!Array.isArray(updates.lengths) || updates.lengths.length === 0) {
      throw new Error('Lengths must be a non-empty array')
    }
    if (updates.lengths.some(length => length <= 0)) {
      throw new Error('All lengths must be positive')
    }
  }

  if ('sizes' in updates && updates.sizes !== undefined) {
    if (!Array.isArray(updates.sizes) || updates.sizes.length === 0) {
      throw new Error('Sheet sizes must be a non-empty array')
    }
    updates.sizes.forEach(size => {
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

  if ('thicknesses' in updates && updates.thicknesses !== undefined) {
    if (!Array.isArray(updates.thicknesses) || updates.thicknesses.length === 0) {
      throw new Error('Sheet thicknesses must be a non-empty array')
    }
    if (updates.thicknesses.some(thickness => thickness <= 0)) {
      throw new Error('All sheet thicknesses must be positive')
    }
  }

  if ('availableVolumes' in updates && updates.availableVolumes !== undefined) {
    if (!Array.isArray(updates.availableVolumes) || updates.availableVolumes.length === 0) {
      throw new Error('Available volumes must be a non-empty array')
    }
    if (updates.availableVolumes.some(volume => volume <= 0)) {
      throw new Error('All available volumes must be positive')
    }
  }

  if ('baleMinLength' in updates && updates.baleMinLength !== undefined && updates.baleMinLength <= 0) {
    throw new Error('Bale minimum length must be positive')
  }
  if ('baleMaxLength' in updates && updates.baleMaxLength !== undefined && updates.baleMaxLength <= 0) {
    throw new Error('Bale maximum length must be positive')
  }
  if (
    'baleMinLength' in updates &&
    'baleMaxLength' in updates &&
    updates.baleMinLength !== undefined &&
    updates.baleMaxLength !== undefined &&
    updates.baleMinLength > updates.baleMaxLength
  ) {
    throw new Error('Bale minimum length cannot exceed the maximum length')
  }
  if ('baleHeight' in updates && updates.baleHeight !== undefined && updates.baleHeight <= 0) {
    throw new Error('Bale height must be positive')
  }
  if ('baleWidth' in updates && updates.baleWidth !== undefined && updates.baleWidth <= 0) {
    throw new Error('Bale width must be positive')
  }
  if ('tolerance' in updates && updates.tolerance !== undefined && updates.tolerance < 0) {
    throw new Error('Bale tolerance cannot be negative')
  }
  if ('topCutoffLimit' in updates && updates.topCutoffLimit !== undefined && updates.topCutoffLimit <= 0) {
    throw new Error('Top cutoff limit must be positive')
  }
  if ('flakeSize' in updates && updates.flakeSize !== undefined && updates.flakeSize <= 0) {
    throw new Error('Flake size must be positive')
  }
}

const useMaterialsStore = create<MaterialsStore>()(
  persist(
    devtools(
      (set, get, store) => ({
        // Initialize with default materials
        materials: { ...DEFAULT_MATERIALS },

        actions: {
          addMaterial: (materialData: Omit<Material, 'id'>) => {
            validateMaterialName(materialData.name)
            validateMaterialUpdates(materialData)

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

          updateMaterial: (id: MaterialId, updates: Partial<Omit<Material, 'id' | 'type'>>) => {
            set(state => {
              const material = state.materials[id]
              if (material == null) return state

              validateMaterialUpdates(updates)

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
