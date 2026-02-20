import type { MaterialId, SheetMaterial } from '@/construction/materials/material'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export const boards: SheetMaterial = {
  id: 'material_board' as MaterialId,
  name: 'Boards',
  nameKey: 'boards',
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

export const clt: SheetMaterial = {
  id: 'material_clt' as MaterialId,
  name: 'Cross-laminated timber (CLT)',
  nameKey: 'clt',
  sizes: [{ smallerLength: 3500, biggerLength: 16500 }],
  thicknesses: [160, 170, 180, 190, 200, 220, 240, 260, 280, 300, 320],
  sheetType: 'tongueAndGroove',
  type: 'sheet',
  color: MATERIAL_COLORS.woodSupport,
  density: 500
}

export const woodwool: SheetMaterial = {
  id: 'material_woodwool' as MaterialId,
  name: 'Woodwool',
  nameKey: 'woodwool',
  sizes: [{ smallerLength: 575, biggerLength: 1220 }],
  thicknesses: [30, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240],
  type: 'sheet',
  color: '#ddb984',
  sheetType: 'flexible',
  density: 50
}

export const osb: SheetMaterial = {
  id: 'material_osb' as MaterialId,
  name: 'OSB',
  nameKey: 'osb',
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
  name: 'DHF (wood fiber board)',
  nameKey: 'dhf',
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

export const bitumen: SheetMaterial = {
  id: 'material_bitumen' as MaterialId,
  name: 'Bitumen',
  nameKey: 'bitumen',
  sizes: [{ smallerLength: 1000, biggerLength: 10000 }],
  thicknesses: [1.2, 1.5, 1.8, 2.0, 3.0, 4.0],
  sheetType: 'flexible',
  type: 'sheet',
  color: '#130f12',
  density: 1000
}

export const cork: SheetMaterial = {
  id: 'material_cork' as MaterialId,
  name: 'Cork',
  nameKey: 'cork',
  sizes: [{ smallerLength: 500, biggerLength: 1000 }],
  thicknesses: [20],
  sheetType: 'solid',
  type: 'sheet',
  color: '#6b5f4e',
  density: 110
}

export const gypsum: SheetMaterial = {
  id: 'material_gypsum' as MaterialId,
  name: 'Gypsum board',
  nameKey: 'gypsum',
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
  name: 'Reed matting',
  nameKey: 'reed',
  sizes: [
    { smallerLength: 180, biggerLength: 10000 },
    { smallerLength: 200, biggerLength: 5000 }
  ],
  thicknesses: [9],
  sheetType: 'flexible',
  type: 'sheet',
  color: '#a78952',
  density: 100
}

export const fireProtectionBoarding: SheetMaterial = {
  id: 'material_fire_boarding' as MaterialId,
  name: 'Fire protection boarding',
  nameKey: 'fireProtectionBoarding',
  sizes: [{ smallerLength: 130, biggerLength: 4000 }],
  thicknesses: [40],
  sheetType: 'solid',
  type: 'sheet',
  color: '#e4c098',
  density: 500
}

export const windBarrier: SheetMaterial = {
  id: 'material_wind_barrier' as MaterialId,
  name: 'Wind barrier',
  nameKey: 'windBarrier',
  sizes: [
    { smallerLength: 1500, biggerLength: 25000 },
    { smallerLength: 1500, biggerLength: 50000 }
  ],
  thicknesses: [1],
  sheetType: 'flexible',
  type: 'sheet',
  color: '#2a2a28',
  density: 150
}

export const lvl: SheetMaterial = {
  id: 'material_lvl' as MaterialId,
  name: 'LVL (Laminated Veneer Lumber)',
  nameKey: 'lvl',
  sizes: [{ smallerLength: 1250, biggerLength: 6000 }],
  thicknesses: [21, 24, 27, 30, 33, 39, 45, 51, 57, 63, 69, 75],
  sheetType: 'solid',
  type: 'sheet',
  color: '#e9d9c4',
  density: 480
}

export const xps: SheetMaterial = {
  id: 'material_xps' as MaterialId,
  name: 'XPS (Extruded Polystyrene)',
  nameKey: 'xps',
  sizes: [
    { smallerLength: 600, biggerLength: 1250 },
    { smallerLength: 600, biggerLength: 2500 }
  ],
  thicknesses: [20, 30, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200],
  sheetType: 'solid',
  type: 'sheet',
  color: '#a8d4e6',
  density: 35
}
