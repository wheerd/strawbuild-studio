import type { Resources } from 'i18next'

import type { Length, Volume } from '@/shared/geometry'
import { createId } from '@/shared/utils/ids'

export type MaterialId = string & { readonly brand: unique symbol }
export const createMaterialId = () => createId('material_') as MaterialId
export const isMaterialId = (id: string): id is MaterialId => id.startsWith('material_')

export type Material =
  | StrawbaleMaterial
  | DimensionalMaterial
  | SheetMaterial
  | VolumeMaterial
  | GenericMaterial
  | PrefabMaterial

export type MaterialType = 'strawbale' | 'dimensional' | 'sheet' | 'volume' | 'generic' | 'prefab'

export interface BaseMaterial {
  type: MaterialType
  id: MaterialId
  name: string
  /** Optional translation key for default materials. If present, use t(nameKey) instead of name for display. Clear when user edits the name. */
  nameKey?: keyof Resources['config']['materials']['defaults']
  color: string
  density?: number // kg/m³
}

export interface CrossSection {
  smallerLength: Length
  biggerLength: Length
}

export interface StrawbaleMaterial extends BaseMaterial {
  type: 'strawbale'
  baleMinLength: Length // Default: 800mm
  baleMaxLength: Length // Default: 900mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  tolerance: Length // Default 2mm
  topCutoffLimit: Length // Default: 50mm
  flakeSize: Length // Default: 70mm
}

export interface DimensionalMaterial extends BaseMaterial {
  type: 'dimensional'
  crossSections: CrossSection[]
  lengths: Length[]
}

export interface SheetSize {
  smallerLength: Length
  biggerLength: Length
}

export type SheetType = 'solid' | 'tongueAndGroove' | 'flexible'

export interface SheetMaterial extends BaseMaterial {
  type: 'sheet'
  sizes: SheetSize[]
  thicknesses: Length[]
  sheetType: SheetType
}

export interface VolumeMaterial extends BaseMaterial {
  type: 'volume'
  availableVolumes: Volume[]
}

export interface GenericMaterial extends BaseMaterial {
  type: 'generic'
}

export interface PrefabSloped {
  minAngleDegrees: number
  maxAngleDegrees: number
}

export interface PrefabMaterial extends BaseMaterial {
  type: 'prefab'
  minHeight: Length
  maxHeight: Length
  minThickness: Length
  maxThickness: Length
  minWidth: Length
  maxWidth: Length
  sloped?: PrefabSloped
}

export * from './defaults'
