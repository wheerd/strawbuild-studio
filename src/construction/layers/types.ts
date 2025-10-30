import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

export type LayerType = 'monolithic' | 'striped'

interface BaseLayerConfig {
  type: LayerType
  thickess: Length
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
