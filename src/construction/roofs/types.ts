import type { Roof } from '@/building/model'
import { sumLayerThickness } from '@/construction/config/store/layerUtils'
import type { PerimeterConstructionContext } from '@/construction/context'
import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, LineSegment2D } from '@/shared/geometry'

export interface RoofAssembly<TConfig extends RoofAssemblyConfigBase> {
  construct: (roof: Roof, config: TConfig, contexts: PerimeterConstructionContext[]) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffsets: (
    roof: Roof,
    config: TConfig,
    line: LineSegment2D,
    contexts: PerimeterConstructionContext[]
  ) => HeightLine
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export type RoofAssemblyType = 'monolithic' | 'purlin'

export interface RoofAssemblyConfigBase {
  type: RoofAssemblyType
  layers: RoofLayersConfig
}

export interface RoofLayersConfig {
  insideThickness: Length
  insideLayers: LayerConfig[]
  topThickness: Length
  topLayers: LayerConfig[]
  overhangThickness: Length
  overhangLayers: LayerConfig[]
}

export interface MonolithicRoofConfig extends RoofAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
  infillMaterial: MaterialId
}

export interface PurlinRoofConfig extends RoofAssemblyConfigBase {
  type: 'purlin'
  thickness: Length

  purlinMaterial: MaterialId
  purlinHeight: Length
  purlinWidth: Length
  purlinSpacing: Length
  purlinInset: Length

  infillMaterial: MaterialId

  rafterMaterial: MaterialId
  rafterWidth: Length
  rafterSpacingMin: Length
  rafterSpacing: Length

  ceilingSheathingMaterial: MaterialId
  ceilingSheathingThickness: Length

  deckingMaterial: MaterialId
  deckingThickness: Length

  strawMaterial?: MaterialId
}

export type RoofConfig = MonolithicRoofConfig | PurlinRoofConfig

export interface HeightJumpItem {
  position: number // between 0 and 1
  offsetBefore: Length // Height offset before this position
  offsetAfter: Length // Height offset after this position
}

export interface HeightItem {
  position: number // between 0 and 1
  offset: Length
  nullAfter: boolean
}

export type HeightLine = (HeightJumpItem | HeightItem)[]

// Validation

export const validateRoofConfig = (config: RoofConfig): void => {
  // Validate type
  if (config.type !== 'monolithic' && config.type !== 'purlin') {
    throw new Error(`Invalid roof type: ${(config as RoofConfig).type}`)
  }

  const { layers } = config

  // Validate layer thicknesses match layer arrays
  const insideThickness = sumLayerThickness(layers.insideLayers)
  if (Math.abs(layers.insideThickness - insideThickness) > 0.01) {
    throw new Error(`Inside layer thickness mismatch: expected ${insideThickness}, got ${layers.insideThickness}`)
  }

  const topThickness = sumLayerThickness(layers.topLayers)
  if (Math.abs(layers.topThickness - topThickness) > 0.01) {
    throw new Error(`Top layer thickness mismatch: expected ${topThickness}, got ${layers.topThickness}`)
  }

  const overhangThickness = sumLayerThickness(layers.overhangLayers)
  if (Math.abs(layers.overhangThickness - overhangThickness) > 0.01) {
    throw new Error(`Overhang layer thickness mismatch: expected ${overhangThickness}, got ${layers.overhangThickness}`)
  }

  // Type-specific validation
  if (config.type === 'monolithic') {
    if (config.thickness <= 0) {
      throw new Error('Monolithic roof thickness must be positive')
    }
    if (!config.material) {
      throw new Error('Monolithic roof must have a material')
    }
  } else if (config.type === 'purlin') {
    // Validate purlin dimensions
    if (config.thickness <= 0) {
      throw new Error('Purlin roof thickness must be positive')
    }
    if (config.purlinHeight <= 0 || config.purlinWidth <= 0 || config.purlinSpacing <= 0) {
      throw new Error('Purlin dimensions must be positive')
    }
    if (config.rafterWidth <= 0 || config.rafterSpacing <= 0) {
      throw new Error('Rafter dimensions must be positive')
    }
    if (config.rafterSpacingMin > config.rafterSpacing || config.rafterSpacingMin < 0) {
      throw new Error('Rafter min spacing must be between 0 and desired spacing')
    }
    if (config.ceilingSheathingThickness <= 0) {
      throw new Error('Ceiling sheathing thickness must be positive')
    }
    if (config.deckingThickness <= 0) {
      throw new Error('Decking thickness must be positive')
    }
  }
}
