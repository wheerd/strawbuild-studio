import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'

export interface FloorAssembly<TConfig extends FloorAssemblyConfigBase> {
  construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export type FloorAssemblyType = 'monolithic' | 'joist'

export interface FloorAssemblyConfigBase {
  type: FloorAssemblyType
  layers: FloorLayersConfig
}

export interface FloorLayersConfig {
  bottomThickness: Length
  topThickness: Length
}

export interface MonolithicFloorConfig extends FloorAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface JoistFloorConfig extends FloorAssemblyConfigBase {
  type: 'joist'
  joistThickness: Length
  joistHeight: Length
  joistSpacing: Length
  joistMaterial: MaterialId
  subfloorThickness: Length
  subfloorMaterial: MaterialId
}

export type FloorConfig = MonolithicFloorConfig | JoistFloorConfig
