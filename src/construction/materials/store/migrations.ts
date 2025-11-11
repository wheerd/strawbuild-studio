import type {
  DimensionalMaterial,
  Material,
  MaterialId,
  SheetMaterial,
  StrawbaleMaterial
} from '@/construction/materials/material'
import { DEFAULT_MATERIALS, strawbale } from '@/construction/materials/material'
import type { MaterialsState } from '@/construction/materials/store'

interface LegacyDimensionalMaterialShape {
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

interface LegacySheetMaterialShape {
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

export const MATERIALS_STORE_VERSION = 2

export const migrateMaterialsState = (persistedState: unknown, _version: number): MaterialsState => {
  const state = (persistedState as MaterialsState) ?? { materials: {} as Record<MaterialId, Material> }
  if (!state.materials || typeof state.materials !== 'object') {
    return { materials: {} as Record<MaterialId, Material> }
  }

  return {
    ...state,
    materials: normalizeMaterialsRecord(state.materials as Record<MaterialId, Material>)
  }
}

export const normalizeMaterialsRecord = (
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
