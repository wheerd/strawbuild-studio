import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, Line2D, Polygon2D } from '@/shared/geometry'

export interface FloorAssembly<TConfig extends FloorAssemblyConfigBase> {
  construct: (context: FloorConstructionContext, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export interface FloorConstructionContext {
  outerLines: Line2D[]
  innerLines: Line2D[]
  outerPolygon: Polygon2D
  innerPolygon: Polygon2D
  openings: Polygon2D[]
}

export type FloorAssemblyType = 'monolithic' | 'joist'

export interface FloorAssemblyConfigBase {
  type: FloorAssemblyType
  layers: FloorLayersConfig
}

export interface FloorLayersConfig {
  bottomThickness: Length
  bottomLayers: LayerConfig[]
  topThickness: Length
  topLayers: LayerConfig[]
}

export interface MonolithicFloorConfig extends FloorAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface JoistFloorConfig extends FloorAssemblyConfigBase {
  type: 'joist'

  constructionHeight: Length

  joistThickness: Length
  joistSpacing: Length
  joistMaterial: MaterialId

  wallBeamThickness: Length
  wallBeamInsideOffset: Length
  wallBeamMaterial: MaterialId
  wallInfillMaterial: MaterialId

  subfloorThickness: Length
  subfloorMaterial: MaterialId

  openingSideThickness: Length
  openingSideMaterial: MaterialId
}

export type FloorConfig = MonolithicFloorConfig | JoistFloorConfig

// Validation

export const validateFloorConfig = (config: FloorConfig): void => {
  if (config.layers.topThickness < 0 || config.layers.bottomThickness < 0) {
    throw new Error('Layer thicknesses cannot be negative')
  }

  if (config.type === 'monolithic') {
    validateMonolithicFloorConfig(config)
  } else if (config.type === 'joist') {
    validateJoistFloorConfig(config)
  } else {
    throw new Error('Invalid floor assembly type')
  }
}

const validateMonolithicFloorConfig = (config: MonolithicFloorConfig): void => {
  if (config.thickness <= 0) {
    throw new Error('CLT thickness must be greater than 0')
  }
}

const validateJoistFloorConfig = (config: JoistFloorConfig): void => {
  if (config.constructionHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Joist dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
}
