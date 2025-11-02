import { clayPlaster, limePlaster } from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const sanitizeThickness = (value: Length | undefined): Length => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? (numeric as Length) : (0 as Length)
}

const createMonolithicLayer = (material: MaterialId, thickness: Length, name: string): LayerConfig => ({
  type: 'monolithic',
  name,
  material,
  thickness: sanitizeThickness(thickness)
})

export const INVALID_FLOOR_LAYER_MATERIAL_ID = 'layer_invalid_material' as MaterialId

export const DEFAULT_WALL_LAYERS: Record<string, LayerConfig> = {
  'Clay Plaster (3cm)': createMonolithicLayer(clayPlaster.id, 30, 'Clay Plaster'),
  'Lime Plaster (3cm)': createMonolithicLayer(limePlaster.id, 30, 'Lime Plaster')
}

export const createDefaultInsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(clayPlaster.id, thickness, 'Inside Finish')
]

export const createDefaultOutsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(limePlaster.id, thickness, 'Outside Finish')
]

export const createDefaultFloorTopLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness, 'Top Layer')
]

export const createDefaultFloorBottomLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness, 'Bottom Layer')
]
