import type { Length, Volume } from '@/shared/geometry'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { createId } from '@/shared/utils/ids'

export type MaterialId = string & { readonly brand: unique symbol }
export const createMaterialId = () => createId<MaterialId>('material_')
export const isMaterialId = (id: string): id is MaterialId => id.startsWith('material_')

export type Material = StrawbaleMaterial | DimensionalMaterial | SheetMaterial | VolumeMaterial | GenericMaterial

export type MaterialType = 'strawbale' | 'dimensional' | 'sheet' | 'volume' | 'generic'

export interface BaseMaterial {
  type: MaterialType
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

export const roughWood: DimensionalMaterial = {
  id: 'material_rough_wood' as MaterialId,
  name: 'Rough-sawn timber',
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  crossSections: [
    { smallerLength: 50, biggerLength: 50 },
    { smallerLength: 50, biggerLength: 80 },
    { smallerLength: 60, biggerLength: 100 },
    { smallerLength: 60, biggerLength: 120 },
    { smallerLength: 60, biggerLength: 140 },
    { smallerLength: 60, biggerLength: 240 },
    { smallerLength: 60, biggerLength: 360 },
    { smallerLength: 80, biggerLength: 120 },
    { smallerLength: 100, biggerLength: 150 }
  ],
  lengths: [2000, 2500, 3000, 4000, 5000],
  density: 480
}

export const battens: DimensionalMaterial = {
  id: 'material_batten' as MaterialId,
  name: 'Battens',
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  crossSections: [
    { smallerLength: 18, biggerLength: 48 },
    { smallerLength: 20, biggerLength: 40 },
    { smallerLength: 24, biggerLength: 48 },
    { smallerLength: 24, biggerLength: 60 },
    { smallerLength: 28, biggerLength: 48 },
    { smallerLength: 38, biggerLength: 68 },
    { smallerLength: 30, biggerLength: 50 },
    { smallerLength: 40, biggerLength: 60 }
  ],
  lengths: [1350, 2000, 2500, 3000, 4000, 5000, 6000],
  density: 480
}

export const structuralWood: DimensionalMaterial = {
  id: 'material_structural_timber' as MaterialId,
  name: 'Structural Timber',
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  crossSections: [
    { smallerLength: 60, biggerLength: 80 },
    { smallerLength: 60, biggerLength: 120 },
    { smallerLength: 80, biggerLength: 120 },
    { smallerLength: 80, biggerLength: 160 },
    { smallerLength: 100, biggerLength: 120 },
    { smallerLength: 100, biggerLength: 160 },
    { smallerLength: 120, biggerLength: 120 },
    { smallerLength: 140, biggerLength: 140 }
  ],
  lengths: [5000, 6000],
  density: 470
}

export const glt: DimensionalMaterial = {
  id: 'material_glt' as MaterialId,
  name: 'Glued Laminated Timber (GLT)',
  type: 'dimensional',
  color: MATERIAL_COLORS.woodSupport,
  crossSections: [
    { smallerLength: 80, biggerLength: 240 },
    { smallerLength: 80, biggerLength: 360 },
    { smallerLength: 100, biggerLength: 280 },
    { smallerLength: 120, biggerLength: 240 },
    { smallerLength: 120, biggerLength: 320 },
    { smallerLength: 140, biggerLength: 360 },
    { smallerLength: 160, biggerLength: 400 },
    { smallerLength: 200, biggerLength: 480 },
    { smallerLength: 240, biggerLength: 600 }
  ],
  lengths: [6000, 8000, 10000, 12000],
  density: 470
}

export const boards: SheetMaterial = {
  id: 'material_board' as MaterialId,
  name: 'Boards / Planks',
  sizes: [
    { smallerLength: 200, biggerLength: 2000 },
    { smallerLength: 200, biggerLength: 2500 },
    { smallerLength: 250, biggerLength: 3000 },
    { smallerLength: 250, biggerLength: 4000 },
    { smallerLength: 250, biggerLength: 5000 }
  ],
  thicknesses: [20, 25],
  sheetType: 'solid',
  type: 'sheet',
  color: MATERIAL_COLORS.woodSupport,
  density: 480
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

export const osb: SheetMaterial = {
  id: 'material_osb' as MaterialId,
  name: 'OSB',
  sizes: [
    { smallerLength: 1220, biggerLength: 2440 },
    { smallerLength: 1250, biggerLength: 2500 },
    { smallerLength: 915, biggerLength: 2135 }
  ],
  thicknesses: [12, 15, 18, 22, 25],
  sheetType: 'solid',
  type: 'sheet',
  color: '#e2b079',
  density: 600
}

export const dhf: SheetMaterial = {
  id: 'material_dhf' as MaterialId,
  name: 'DHF (wood fibre board)',
  sizes: [
    { smallerLength: 625, biggerLength: 2500 },
    { smallerLength: 1220, biggerLength: 2440 },
    { smallerLength: 1250, biggerLength: 2500 },
    { smallerLength: 1000, biggerLength: 2500 }
  ],
  thicknesses: [15, 16, 18, 22, 25, 35],
  sheetType: 'tongueAndGroove',
  type: 'sheet',
  color: '#c9a36a',
  density: 250
}

export const brick: DimensionalMaterial = {
  id: 'material_aac_brick' as MaterialId,
  name: 'AAC Brick',
  type: 'dimensional',
  color: '#b2b2af',
  crossSections: [{ smallerLength: 240, biggerLength: 300 }],
  lengths: [600],
  density: 750
}

export const bitumen: SheetMaterial = {
  id: 'material_bitumen' as MaterialId,
  name: 'Bitumen Felt',
  sizes: [{ smallerLength: 1000, biggerLength: 10000 }],
  thicknesses: [1.2, 1.5, 1.8, 2.0, 3.0, 4.0],
  sheetType: 'flexible',
  type: 'sheet',
  color: '#130f12',
  density: 1000
}

export const cork: SheetMaterial = {
  id: 'material_cork' as MaterialId,
  name: 'Cork Insulation',
  sizes: [{ smallerLength: 500, biggerLength: 1000 }],
  thicknesses: [20],
  sheetType: 'solid',
  type: 'sheet',
  color: '#6b5f4e',
  density: 110
}

export const gypsum: SheetMaterial = {
  id: 'material_gypsum' as MaterialId,
  name: 'Gypsum Board',
  sizes: [
    { smallerLength: 1200, biggerLength: 2000 },
    { smallerLength: 1200, biggerLength: 2400 },
    { smallerLength: 1200, biggerLength: 2600 },
    { smallerLength: 1200, biggerLength: 3000 }
  ],
  thicknesses: [9.5, 12.5, 15],
  sheetType: 'solid',
  type: 'sheet',
  color: '#d9d9d9',
  density: 850
}

export const reed: SheetMaterial = {
  id: 'material_reed' as MaterialId,
  name: 'Reed Mat',
  sizes: [
    { smallerLength: 180, biggerLength: 10000 },
    { smallerLength: 200, biggerLength: 5000 }
  ],
  thicknesses: [9],
  sheetType: 'flexible',
  type: 'sheet',
  color: '#a78952',
  density: 100 // Need to be checked
}

export const fireProtectionBoarding: SheetMaterial = {
  id: 'material_fire_boarding' as MaterialId,
  name: 'Fire Protection Boarding',
  sizes: [{ smallerLength: 130, biggerLength: 4000 }],
  thicknesses: [40],
  sheetType: 'solid',
  type: 'sheet',
  color: '#e4c098',
  density: 500
}

export const DEFAULT_MATERIALS: Record<MaterialId, Material> = {
  [battens.id]: battens,
  [bitumen.id]: bitumen,
  [boards.id]: boards,
  [brick.id]: brick,
  [cementScreed.id]: cementScreed,
  [clayPlasterBase.id]: clayPlasterBase,
  [clayPlasterFine.id]: clayPlasterFine,
  [clt.id]: clt,
  [concrete.id]: concrete,
  [cork.id]: cork,
  [dhf.id]: dhf,
  [door.id]: door,
  [fireProtectionBoarding.id]: fireProtectionBoarding,
  [glt.id]: glt,
  [gypsum.id]: gypsum,
  [impactSoundInsulation.id]: impactSoundInsulation,
  [limePlasterBase.id]: limePlasterBase,
  [limePlasterFine.id]: limePlasterFine,
  [osb.id]: osb,
  [reed.id]: reed,
  [roughWood.id]: roughWood,
  [strawbale.id]: strawbale,
  [structuralWood.id]: structuralWood,
  [window.id]: window,
  [woodwool.id]: woodwool
}
