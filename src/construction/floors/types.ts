import type { FloorAssemblyId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'

export interface FloorAssembly<TConfig extends FloorAssemblyBaseConfig> {
  construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export type FloorAssemblyType = 'monolithic' | 'joist'

export interface FloorAssemblyBaseConfig {
  id: FloorAssemblyId
  name: string
  type: FloorAssemblyType
  layers: FloorLayersConfig
}

export interface FloorLayersConfig {
  bottomThickness: Length
  topThickness: Length
}

export interface MonolithicFloorAssemblyConfig extends FloorAssemblyBaseConfig {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface JoistFloorAssemblyConfig extends FloorAssemblyBaseConfig {
  type: 'joist'
  joistThickness: Length
  joistHeight: Length
  joistSpacing: Length
  joistMaterial: MaterialId
  subfloorThickness: Length
  subfloorMaterial: MaterialId
}

export type FloorAssemblyConfig = MonolithicFloorAssemblyConfig | JoistFloorAssemblyConfig
