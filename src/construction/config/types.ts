import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { RingBeamConfig } from '@/construction/ringBeams/ringBeams'
import type {
  BaseConstructionConfig,
  InfillConstructionConfig,
  StrawhengeConstructionConfig
} from '@/construction/walls'
import type { Length } from '@/shared/geometry'

export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  config: RingBeamConfig
}

// Placeholder config interface for non-strawbale construction
export interface NonStrawbaleConfig extends BaseConstructionConfig {
  type: 'non-strawbale'
  material: MaterialId
  thickness: number
}

export interface LayersConfig {
  insideThickness: Length
  outsideThickness: Length
}

export type PerimeterConstructionConfig = InfillConstructionConfig | StrawhengeConstructionConfig | NonStrawbaleConfig

export interface PerimeterConstructionMethod {
  id: PerimeterConstructionMethodId
  name: string
  config: PerimeterConstructionConfig
  layers: LayersConfig
}
