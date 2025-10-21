import type { Length } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { createId } from '@/shared/utils/ids'

export type MaterialId = string & { readonly brand: unique symbol }
export const createMaterialId = () => createId<MaterialId>('material_')
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
  id: 'material_wood360x60' as MaterialId,
  name: 'Wood 36cm x 6cm',
  width: 360,
  thickness: 60,
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  availableLengths: [5000]
}

export const wood240x60: DimensionalMaterial = {
  id: 'material_wood240x60' as MaterialId,
  name: 'Wood 24cm x 6cm',
  width: 240,
  thickness: 60,
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  availableLengths: [5000]
}

export const wood120x60: DimensionalMaterial = {
  id: 'material_wood120x60' as MaterialId,
  name: 'Wood 12cm x 6cm',
  width: 120,
  thickness: 60,
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  availableLengths: [5000]
}

export const wood140x140: DimensionalMaterial = {
  id: 'material_wood140x140' as MaterialId,
  name: 'Wood 14cm x 14cm',
  width: 140,
  thickness: 140,
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  availableLengths: [5000]
}

export const strawbale: DimensionalMaterial = {
  id: 'material_strawbale' as MaterialId,
  name: 'Strawbale',
  width: 500,
  thickness: 360,
  type: 'dimensional',
  color: MATERIAL_COLORS.strawbale,
  availableLengths: [800]
}

export const straw: GenericMaterial = {
  id: 'material_straw' as MaterialId,
  name: 'Straw',
  type: 'generic',
  color: MATERIAL_COLORS.straw
}

export const window: GenericMaterial = {
  id: 'material_window' as MaterialId,
  name: 'Window',
  color: MATERIAL_COLORS.window,
  type: 'generic'
}

export const door: GenericMaterial = {
  id: 'material_door' as MaterialId,
  name: 'Door',
  color: MATERIAL_COLORS.door,
  type: 'generic'
}

export const concrete: GenericMaterial = {
  id: 'material_concrete' as MaterialId,
  name: 'Concrete',
  type: 'generic',
  color: MATERIAL_COLORS.concrete
}

export const clt180: SheetMaterial = {
  id: 'material_clt180' as MaterialId,
  name: 'CLT 18cm',
  width: 2440,
  length: 6000,
  thickness: 180,
  type: 'sheet',
  color: MATERIAL_COLORS.woodSupport
}

export const woodwool: SheetMaterial = {
  id: 'material_woodwool' as MaterialId,
  name: 'Woodwool Insulation',
  width: 575,
  length: 1220,
  thickness: 60,
  type: 'sheet',
  color: '#ddb984'
}

export const DEFAULT_MATERIALS: Record<MaterialId, Material> = {
  [wood360x60.id]: wood360x60,
  [wood240x60.id]: wood240x60,
  [wood120x60.id]: wood120x60,
  [wood140x140.id]: wood140x140,
  [strawbale.id]: strawbale,
  [straw.id]: straw,
  [window.id]: window,
  [door.id]: door,
  [concrete.id]: concrete,
  [clt180.id]: clt180,
  [woodwool.id]: woodwool
}
