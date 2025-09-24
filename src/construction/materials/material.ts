import { COLORS } from '@/shared/theme/colors'
import type { Length } from '@/shared/geometry'

export type MaterialId = string & { readonly brand: unique symbol }
export const createMaterialId = (): MaterialId => `material_${Date.now()}_${Math.random()}` as MaterialId
export const isMaterialId = (id: string): id is MaterialId => id.startsWith('material_')

export type Material = DimensionalMaterial | SheetMaterial | VolumeMaterial | GenericMaterial

export interface BaseMaterial {
  type: 'dimensional' | 'sheet' | 'volume' | 'generic'
  id: MaterialId
  name: string
  color: string
}

export interface DimensionalMaterial extends BaseMaterial {
  type: 'dimensional'
  width: Length
  thickness: Length
  availableLengths: Length[]
}

export interface SheetMaterial extends BaseMaterial {
  type: 'sheet'
  width: Length
  length: Length
  thickness: Length
}

export interface VolumeMaterial extends BaseMaterial {
  type: 'volume'
  availableVolumes: number[]
}

export interface GenericMaterial extends BaseMaterial {
  type: 'generic'
}

export const wood360x60: DimensionalMaterial = {
  id: createMaterialId(),
  name: 'Wood 36cm x 6cm',
  width: 360 as Length,
  thickness: 60 as Length,
  type: 'dimensional',
  color: COLORS.materials.woodSupport,
  availableLengths: [5000 as Length]
}

export const wood240x60: DimensionalMaterial = {
  id: createMaterialId(),
  name: 'Wood 24cm x 6cm',
  width: 240 as Length,
  thickness: 60 as Length,
  type: 'dimensional',
  color: COLORS.materials.woodSupport,
  availableLengths: [5000 as Length]
}

export const wood120x60: DimensionalMaterial = {
  id: createMaterialId(),
  name: 'Wood 12cm x 6cm',
  width: 120 as Length,
  thickness: 60 as Length,
  type: 'dimensional',
  color: COLORS.materials.woodSupport,
  availableLengths: [5000 as Length]
}

export const wood140x140: DimensionalMaterial = {
  id: createMaterialId(),
  name: 'Wood 14cm x 14cm',
  width: 140 as Length,
  thickness: 140 as Length,
  type: 'dimensional',
  color: COLORS.materials.woodSupport,
  availableLengths: [5000 as Length]
}

export const strawbale: DimensionalMaterial = {
  id: createMaterialId(),
  name: 'Strawbale',
  width: 500 as Length,
  thickness: 360 as Length,
  type: 'dimensional',
  color: COLORS.materials.strawbale,
  availableLengths: [800 as Length]
}

export const window: GenericMaterial = {
  id: createMaterialId(),
  name: 'Window',
  color: COLORS.materials.window,
  type: 'generic'
}

export const door: GenericMaterial = {
  id: createMaterialId(),
  name: 'Door',
  color: COLORS.materials.door,
  type: 'generic'
}

export const DEFAULT_MATERIALS: Record<MaterialId, Material> = {
  [wood360x60.id]: wood360x60,
  [wood240x60.id]: wood240x60,
  [wood120x60.id]: wood120x60,
  [wood140x140.id]: wood140x140,
  [strawbale.id]: strawbale,
  [window.id]: window,
  [door.id]: door
}

export type ResolveMaterialFunction = (materialId: MaterialId) => Material | undefined

export const resolveDefaultMaterial: ResolveMaterialFunction = (materialId: MaterialId) => DEFAULT_MATERIALS[materialId]
