import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type {
  DimensionalMaterial,
  GenericMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  VolumeMaterial
} from './material'
import { DEFAULT_MATERIALS, createMaterialId } from './material'

export interface MaterialsState {
  materials: Record<MaterialId, Material>
}

export interface MaterialsActions {
  // CRUD operations
  addMaterial: (
    material:
      | Omit<DimensionalMaterial, 'id'>
      | Omit<SheetMaterial, 'id'>
      | Omit<VolumeMaterial, 'id'>
      | Omit<GenericMaterial, 'id'>
  ) => Material
  removeMaterial: (id: MaterialId) => void
  updateMaterial: (id: MaterialId, updates: Partial<Omit<Material, 'id' | 'type'>>) => void
  duplicateMaterial: (id: MaterialId, newName: string) => Material

  // Queries
  getMaterialById: (id: MaterialId) => Material | null
  getAllMaterials: () => Material[]
  getMaterialsByType: (type: Material['type']) => Material[]
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

  // Type-specific validations with proper type checking
  if ('width' in updates && updates.width !== undefined && updates.width !== null) {
    if (typeof updates.width === 'number' && updates.width <= 0) {
      throw new Error('Width must be positive')
    }
  }
  if ('thickness' in updates && updates.thickness !== undefined && updates.thickness !== null) {
    if (typeof updates.thickness === 'number' && updates.thickness <= 0) {
      throw new Error('Thickness must be positive')
    }
  }
  if ('length' in updates && updates.length !== undefined && updates.length !== null) {
    if (typeof updates.length === 'number' && updates.length <= 0) {
      throw new Error('Length must be positive')
    }
  }
  if ('availableLengths' in updates && updates.availableLengths !== undefined) {
    if (!Array.isArray(updates.availableLengths) || updates.availableLengths.length === 0) {
      throw new Error('Available lengths must be a non-empty array')
    }
    if (updates.availableLengths.some(length => length <= 0)) {
      throw new Error('All available lengths must be positive')
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
}

const useMaterialsStore = create<MaterialsStore>()(
  persist(
    devtools(
      (set, get) => ({
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
              const { [id]: removed, ...remainingMaterials } = state.materials
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
          }
        }
      }),
      { name: 'materials-store' }
    ),
    {
      name: 'strawbaler-materials',
      partialize: state => ({
        materials: state.materials
      })
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
