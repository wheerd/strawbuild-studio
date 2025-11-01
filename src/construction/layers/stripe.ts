import type { LayerConstruction, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionResult, yieldWarning } from '@/construction/results'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'

export class StripedLayerConstruction implements LayerConstruction<StripedLayerConfig> {
  construct = function* (
    _polygon: PolygonWithHoles2D,
    _offset: Length,
    _config: StripedLayerConfig
  ): Generator<ConstructionResult> {
    yieldWarning({
      description: 'Striped layer is not yet supported.',
      elements: [],
      groupKey: 'unsupported-stripe-layer'
    })
  }
}
