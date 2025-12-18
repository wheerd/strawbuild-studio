import type { PerimeterConstructionContext } from '@/construction/context'
import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length } from '@/shared/geometry'

export interface FloorAssembly<TConfig extends FloorAssemblyConfigBase> {
  construct: (context: PerimeterConstructionContext, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export type FloorAssemblyType = 'monolithic' | 'joist' | 'filled'

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

export interface FilledFloorConfig extends FloorAssemblyConfigBase {
  type: 'filled'

  constructionHeight: Length

  joistThickness: Length
  joistSpacing: Length
  joistMaterial: MaterialId

  frameThickness: Length
  frameMaterial: MaterialId

  subfloorThickness: Length
  subfloorMaterial: MaterialId

  ceilingSheathingThickness: Length
  ceilingSheathingMaterial: MaterialId

  openingFrameThickness: Length
  openingFrameMaterial: MaterialId

  strawMaterial?: MaterialId
}

export type FloorConfig = MonolithicFloorConfig | JoistFloorConfig | FilledFloorConfig

// Validation

export const validateFloorConfig = (config: FloorConfig): void => {
  if (config.layers.topThickness < 0 || config.layers.bottomThickness < 0) {
    throw new Error('Layer thicknesses cannot be negative')
  }

  if (config.type === 'monolithic') {
    validateMonolithicFloorConfig(config)
  } else if (config.type === 'joist') {
    validateJoistFloorConfig(config)
  } else if (config.type === 'filled') {
    validateFilledFloorConfig(config)
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

const validateFilledFloorConfig = (config: FilledFloorConfig): void => {
  if (config.constructionHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Filled floor dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.frameThickness <= 0) {
    throw new Error('Frame thickness must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
  if (config.ceilingSheathingThickness <= 0) {
    throw new Error('Ceiling sheathing thickness must be greater than 0')
  }
  if (config.openingFrameThickness <= 0) {
    throw new Error('Opening frame thickness must be greater than 0')
  }
}
