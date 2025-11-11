import type { Length, Volume } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { createId } from '@/shared/utils/ids'

export type MaterialId = string & { readonly brand: unique symbol }
export const createMaterialId = () => createId<MaterialId>('material_')
export const isMaterialId = (id: string): id is MaterialId => id.startsWith('material_')

export type Material = StrawbaleMaterial | DimensionalMaterial | SheetMaterial | VolumeMaterial | GenericMaterial

export interface BaseMaterial {
  type: 'strawbale' | 'dimensional' | 'sheet' | 'volume' | 'generic'
  id: MaterialId
  name: string
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

export interface SheetMaterial extends BaseMaterial {
  type: 'sheet'
  sizes: SheetSize[]
  thicknesses: Length[]
  sheetType: 'solid' | 'tongueAndGroove' | 'flexible'
}

export interface VolumeMaterial extends BaseMaterial {
  type: 'volume'
  availableVolumes: Volume[]
}

export interface GenericMaterial extends BaseMaterial {
  type: 'generic'
}

export const wood: DimensionalMaterial = {
  id: 'material_wood' as MaterialId,
  name: 'Wood',
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  crossSections: [
    { smallerLength: 60, biggerLength: 360 },
    { smallerLength: 60, biggerLength: 240 },
    { smallerLength: 60, biggerLength: 120 },
    { smallerLength: 140, biggerLength: 140 }
  ],
  lengths: [5000],
  density: 520
}

export const strawbale: StrawbaleMaterial = {
  id: 'material_strawbale' as MaterialId,
  type: 'strawbale',
  color: MATERIAL_COLORS.strawbale,
  name: 'Strawbale',
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70,
  density: 110
}

export const straw: VolumeMaterial = {
  id: 'material_straw' as MaterialId,
  name: 'Straw',
  type: 'volume',
  availableVolumes: [140000000],
  color: MATERIAL_COLORS.straw,
  density: 90
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

export const concrete: VolumeMaterial = {
  id: 'material_concrete' as MaterialId,
  name: 'Concrete',
  type: 'volume',
  color: '#97989d',
  availableVolumes: [],
  density: 2400
}

export const clt: SheetMaterial = {
  id: 'material_clt' as MaterialId,
  name: 'CLT',
  sizes: [{ smallerLength: 3500, biggerLength: 16500 }],
  thicknesses: [160, 170, 180, 190, 200, 220, 240, 260, 280, 300, 320],
  sheetType: 'tongueAndGroove',
  type: 'sheet',
  color: MATERIAL_COLORS.woodSupport,
  density: 500
}

export const woodwool: SheetMaterial = {
  id: 'material_woodwool' as MaterialId,
  name: 'Woodwool Insulation',
  sizes: [{ smallerLength: 575, biggerLength: 1220 }],
  thicknesses: [30, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240],
  type: 'sheet',
  color: '#ddb984',
  sheetType: 'flexible',
  density: 50
}

export const clayPlasterBase: VolumeMaterial = {
  id: 'material_clay_plaster_base' as MaterialId,
  name: 'Clay Plaster (Base)',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605], // 1t, 1/2t
  color: '#927d61',
  density: 1670
}

export const clayPlasterFine: VolumeMaterial = {
  id: 'material_clay_plaster_fine' as MaterialId,
  name: 'Clay Plaster (Fine)',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605], // 1t, 1/2t
  color: '#927d61',
  density: 1670
}

export const limePlasterBase: VolumeMaterial = {
  id: 'material_lime_plaster_base' as MaterialId,
  name: 'Lime Plaster (Base)',
  type: 'volume',
  availableVolumes: [19800000], // 25kg
  color: '#e5dbd3',
  density: 1262
}

export const limePlasterFine: VolumeMaterial = {
  id: 'material_lime_plaster_fine' as MaterialId,
  name: 'Lime Plaster (Fine)',
  type: 'volume',
  availableVolumes: [19800000], // 25kg
  color: '#e5dbd3',
  density: 1262
}

export const cementScreed: VolumeMaterial = {
  id: 'material_cement_screed' as MaterialId,
  name: 'Cement Screed',
  type: 'volume',
  availableVolumes: [],
  color: '#767773',
  density: 2000
}

export const impactSoundInsulation: VolumeMaterial = {
  id: 'material_impact_sound_insulation' as MaterialId,
  name: 'Impact Sound Insulation',
  type: 'volume',
  availableVolumes: [],
  color: '#CCCC33',
  density: 40
}

export const DEFAULT_MATERIALS: Record<MaterialId, Material> = {
  [wood.id]: wood,
  [strawbale.id]: strawbale,
  [straw.id]: straw,
  [window.id]: window,
  [door.id]: door,
  [concrete.id]: concrete,
  [clt.id]: clt,
  [woodwool.id]: woodwool,
  [clayPlasterBase.id]: clayPlasterBase,
  [clayPlasterFine.id]: clayPlasterFine,
  [limePlasterBase.id]: limePlasterBase,
  [limePlasterFine.id]: limePlasterFine,
  [cementScreed.id]: cementScreed,
  [impactSoundInsulation.id]: impactSoundInsulation
}
