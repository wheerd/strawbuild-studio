import { mat4, vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import type { LayerConstruction, MonolithicLayerConfig } from '@/construction/layers/types'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import type { Length, Plane3D, PolygonWithHoles2D } from '@/shared/geometry'

export class MonolithicLayerConstruction implements LayerConstruction<MonolithicLayerConfig> {
  construct = function* (
    polygon: PolygonWithHoles2D,
    offset: Length,
    plane: Plane3D,
    config: MonolithicLayerConfig
  ): Generator<ConstructionResult> {
    const position =
      plane === 'xy'
        ? vec3.fromValues(0, 0, offset)
        : plane === 'xz'
          ? vec3.fromValues(0, offset, 0)
          : vec3.fromValues(offset, 0, 0)

    yield* yieldElement(
      createConstructionElement(
        config.material,
        createExtrudedPolygon(polygon, plane, config.thickness),
        mat4.fromTranslation(mat4.create(), position)
      )
    )
  }
}
