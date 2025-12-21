import { MonolithicLayerConstruction } from '@/construction/layers/monolithic'
import { StripedLayerConstruction } from '@/construction/layers/stripe'
import type { ConstructionResult } from '@/construction/results'
import type { Length, Plane3D, PolygonWithHoles2D } from '@/shared/geometry'

import type { LayerConfig, LayerConstruction, LayerType, MonolithicLayerConfig, StripedLayerConfig } from './types'

export const LAYER_CONSTRUCTIONS: {
  [TType in LayerType]: LayerConstruction<Extract<LayerConfig, { type: TType }>>
} = {
  monolithic: new MonolithicLayerConstruction(),
  striped: new StripedLayerConstruction()
}

export const runLayerConstruction = (
  polygon: PolygonWithHoles2D,
  offset: Length,
  plane: Plane3D,
  config: LayerConfig
): Generator<ConstructionResult> => {
  if (config.type === 'monolithic') {
    const construction = LAYER_CONSTRUCTIONS.monolithic as (typeof LAYER_CONSTRUCTIONS)['monolithic']
    return construction.construct(polygon, offset, plane, config as MonolithicLayerConfig)
  }

  if (config.type === 'striped') {
    const construction = LAYER_CONSTRUCTIONS.striped as (typeof LAYER_CONSTRUCTIONS)['striped']
    return construction.construct(polygon, offset, plane, config as StripedLayerConfig)
  }

  throw new Error('Unsupported layer type')
}
