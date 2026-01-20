import type { DimensionalMaterial, MaterialId } from '@/construction/materials/material'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export const roughWood: DimensionalMaterial = {
  id: 'material_rough_wood' as MaterialId,
  name: 'Rough-sawn timber',
  nameKey: 'roughWood',
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
  nameKey: 'battens',
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
  name: 'Structural timber',
  nameKey: 'structuralWood',
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
  name: 'Glulam (GLT)',
  nameKey: 'glt',
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

export const brick: DimensionalMaterial = {
  id: 'material_aac_brick' as MaterialId,
  name: 'Brick',
  nameKey: 'brick',
  type: 'dimensional',
  color: '#b2b2af',
  crossSections: [{ smallerLength: 240, biggerLength: 300 }],
  lengths: [600],
  density: 750
}
