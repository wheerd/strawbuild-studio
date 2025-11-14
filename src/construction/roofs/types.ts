import type { vec2 } from 'gl-matrix'

import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, LineSegment2D, Polygon2D } from '@/shared/geometry'

export interface RoofAssembly<TConfig extends RoofAssemblyConfigBase> {
  construct: (polygon: Polygon2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffsets: (config: TConfig, wallLine: LineSegment2D) => vec2[]
  getConstructionThickness: (config: TConfig) => Length
}

export type RoofAssemblyType = 'monolithic' // | 'joist'

export interface RoofAssemblyConfigBase {
  type: RoofAssemblyType
  layers: RoofLayersConfig
}

export interface RoofLayersConfig {
  bottomThickness: Length
  bottomLayers: LayerConfig[]
  topThickness: Length
  topLayers: LayerConfig[]
}

export interface MonolithicRoofConfig extends RoofAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export type RoofConfig = MonolithicRoofConfig // | JoistRoofConfig

// Validation

export const validateRoofConfig = (_config: RoofConfig): void => {
  // TODO
}
