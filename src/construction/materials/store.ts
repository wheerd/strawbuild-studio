import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type {
  DimensionalMaterial,
  GenericMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  StrawbaleMaterial,
  VolumeMaterial
} from './material'
import { DEFAULT_MATERIALS, createMaterialId, strawbale } from './material'

type LegacyDimensionalMaterialShape = {
  id: MaterialId
  name: string
  color: string
  density?: number
  crossSections?: DimensionalMaterial['crossSections']
  lengths?: DimensionalMaterial['lengths']
  width?: number
  thickness?: number
  availableLengths?: number[]
}

type LegacySheetMaterialShape = {
  id: MaterialId
  name: string
  color: string
  density?: number
  sizes?: SheetMaterial['sizes']
  thicknesses?: SheetMaterial['thicknesses']
  width?: number
  length?: number
  thickness?: number
  sheetType?: SheetMaterial['sheetType']
}

export interface MaterialsState {
  materials: Record<MaterialId, Material>
}

export interface MaterialsActions {
  // CRUD operations
  addMaterial: (
    material:
      | Omit<DimensionalMaterial, 'id'>
      | Omit<SheetMaterial, 'id'>
      | Omit<StrawbaleMaterial, 'id'>
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

const normalizeDimensionalMaterial = (material: LegacyDimensionalMaterialShape): DimensionalMaterial => {
  const crossSections =
    Array.isArray(material.crossSections) && material.crossSections.length > 0
      ? material.crossSections.map(section => ({
          smallerLength: Number(section.smallerLength),
          biggerLength: Number(section.biggerLength)
        }))
      : createLegacyCrossSection(material.width, material.thickness)

  const lengths =
    Array.isArray(material.lengths) && material.lengths.length > 0
      ? material.lengths
      : Array.isArray(material.availableLengths)
        ? material.availableLengths
        : []

  return {
    type: 'dimensional',
    id: material.id,
    name: material.name,
    color: material.color,
    density: material.density,
    crossSections,
    lengths
  }
}

const createLegacyCrossSection = (width?: number, thickness?: number): DimensionalMaterial['crossSections'] => {
  if (typeof width === 'number' && width > 0 && typeof thickness === 'number' && thickness > 0) {
    const smaller = Math.min(width, thickness)
    const bigger = Math.max(width, thickness)
    return [{ smallerLength: smaller, biggerLength: bigger }]
  }
  return [{ smallerLength: 0, biggerLength: 0 }]
}

const normalizeSheetMaterial = (material: LegacySheetMaterialShape): SheetMaterial => {
  const sizes =
    Array.isArray(material.sizes) && material.sizes.length > 0
      ? material.sizes.map(size => ({
          smallerLength: Number(size.smallerLength),
          biggerLength: Number(size.biggerLength)
        }))
      : createLegacySheetSize(material.width, material.length)

  const thicknesses =
    Array.isArray(material.thicknesses) && material.thicknesses.length > 0
      ? material.thicknesses
      : material.thickness !== undefined
        ? [material.thickness]
        : []

  return {
    type: 'sheet',
    id: material.id,
    name: material.name,
    color: material.color,
    density: material.density,
    sizes,
    thicknesses,
    sheetType: material.sheetType ?? 'solid'
  }
}

const createLegacySheetSize = (width?: number, length?: number): SheetMaterial['sizes'] => {
  if (typeof width === 'number' && width > 0 && typeof length === 'number' && length > 0) {
    const smaller = Math.min(width, length)
    const bigger = Math.max(width, length)
    return [{ smallerLength: smaller, biggerLength: bigger }]
  }
  return [{ smallerLength: 0, biggerLength: 0 }]
}

const normalizeStrawbaleMaterial = (
  material: Partial<StrawbaleMaterial> & { id: MaterialId; name: string }
): StrawbaleMaterial => {
  const defaults = DEFAULT_MATERIALS[strawbale.id] as StrawbaleMaterial
  return {
    type: 'strawbale',
    id: material.id,
    name: material.name ?? defaults.name,
    color: material.color ?? defaults.color,
    density: material.density ?? defaults.density,
    baleMinLength: material.baleMinLength ?? defaults.baleMinLength,
    baleMaxLength: material.baleMaxLength ?? defaults.baleMaxLength,
    baleHeight: material.baleHeight ?? defaults.baleHeight,
    baleWidth: material.baleWidth ?? defaults.baleWidth,
    tolerance: material.tolerance ?? defaults.tolerance,
    topCutoffLimit: material.topCutoffLimit ?? defaults.topCutoffLimit,
    flakeSize: material.flakeSize ?? defaults.flakeSize
  }
}

const normalizeMaterialsRecord = (
  materials: Record<MaterialId, Material | Record<string, unknown>>
): Record<MaterialId, Material> => {
  const normalized: Record<MaterialId, Material> = {}

  Object.entries(materials).forEach(([id, value]) => {
    if (!value || typeof value !== 'object') {
      return
    }

    const material = value as Material & Record<string, unknown>
    switch (material.type) {
      case 'dimensional':
        normalized[id as MaterialId] = normalizeDimensionalMaterial(material as LegacyDimensionalMaterialShape)
        break
      case 'sheet':
        normalized[id as MaterialId] = normalizeSheetMaterial(material as LegacySheetMaterialShape)
        break
      case 'strawbale':
        normalized[id as MaterialId] = normalizeStrawbaleMaterial(material)
        break
      default:
        normalized[id as MaterialId] = material as Material
        break
    }
  })

  return normalized
}

const useMaterialsStore = create<MaterialsStore>()(
  persist(
    devtools(
      (set, get, store) => ({
        // Initialize with default materials
        materials: normalizeMaterialsRecord({ ...DEFAULT_MATERIALS }),

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
      partialize: state => ({
        materials: state.materials
      }),
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as MaterialsStore)
        }
        merged.materials = normalizeMaterialsRecord(merged.materials)
        return merged
      }
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
