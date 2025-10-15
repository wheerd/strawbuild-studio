import type { Perimeter } from '@/building/model'
import type { RingBeamAssemblyId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length } from '@/shared/geometry'

export interface RingBeamAssembly<TConfig extends RingBeamAssemblyBaseConfig> {
  construct: (perimeter: Perimeter, config: TConfig) => ConstructionModel
}

export interface RingBeamAssemblyBaseConfig {
  id: RingBeamAssemblyId
  name: string
  type: RingBeamAssemblyType
  height: Length // Default: 60mm
  material: MaterialId
}

export interface FullRingBeamAssemblyConfig extends RingBeamAssemblyBaseConfig {
  type: 'full'
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
}

export interface DoubleRingBeamAssemblyConfig extends RingBeamAssemblyBaseConfig {
  type: 'double'
  thickness: Length // Default: 120mm
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}

export type RingBeamAssemblyType = 'full' | 'double'

export type RingBeamAssemblyConfig = FullRingBeamAssemblyConfig | DoubleRingBeamAssemblyConfig
