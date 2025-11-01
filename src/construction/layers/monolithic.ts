import { vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import type { LayerConstruction, MonolithicLayerConfig } from '@/construction/layers/types'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'

export class MonolithicLayerConstruction implements LayerConstruction<MonolithicLayerConfig> {
  construct = function* (
    polygon: PolygonWithHoles2D,
    offset: Length,
    config: MonolithicLayerConfig
  ): Generator<ConstructionResult> {
    yield yieldElement(
      createConstructionElement(config.material, createExtrudedPolygon(polygon, 'xy', config.thickness), {
        position: [0, 0, offset],
        rotation: vec3.fromValues(0, 0, 0)
      })
    )
  }
}
