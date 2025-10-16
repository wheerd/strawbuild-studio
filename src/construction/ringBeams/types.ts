import type { Perimeter } from '@/building/model'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length } from '@/shared/geometry'

export type RingBeamAssemblyType = 'full' | 'double'

export interface RingBeamAssembly<TConfig extends RingBeamConfig> {
  construct: (perimeter: Perimeter, config: TConfig) => ConstructionModel
}

export interface RingBeamConfigBase {
  type: RingBeamAssemblyType
  height: Length // Default: 60mm
  material: MaterialId
}

export interface FullRingBeamConfig extends RingBeamConfigBase {
  type: 'full'
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
}

export interface DoubleRingBeamConfig extends RingBeamConfigBase {
  type: 'double'
  thickness: Length // Default: 120mm
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}
export type RingBeamConfig = FullRingBeamConfig | DoubleRingBeamConfig
