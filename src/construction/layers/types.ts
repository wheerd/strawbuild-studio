import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionResult } from '@/construction/results'
import { type Length, type Plane3D, type PolygonWithHoles2D, type Vec2 } from '@/shared/geometry'

export interface LayerConstruction<TConfig extends BaseLayerConfig> {
  construct(
    polygon: PolygonWithHoles2D,
    offset: Length,
    plane: Plane3D,
    config: TConfig,
    direction?: Vec2
  ): Generator<ConstructionResult>
}

export type LayerType = 'monolithic' | 'striped'

interface BaseLayerConfig {
  type: LayerType
  name: string
  thickness: Length
  overlap?: boolean
}

export interface MonolithicLayerConfig extends BaseLayerConfig {
  type: 'monolithic'
  material: MaterialId
}

export type StripeDirection = 'perpendicular' | 'colinear' | 'diagonal'

export interface StripedLayerConfig extends BaseLayerConfig {
  type: 'striped'
  direction: StripeDirection
  stripeWidth: Length
  stripeMaterial: MaterialId
  gapWidth: Length
  gapMaterial?: MaterialId
}

export type LayerConfig = MonolithicLayerConfig | StripedLayerConfig
