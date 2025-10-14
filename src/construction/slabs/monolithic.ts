import type { MonolithicSlabConstructionConfig } from '@/construction/config/types'
import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_SLAB } from '@/construction/tags'
import { type Length, type PolygonWithHoles2D, createLength } from '@/shared/geometry'

import { BaseSlabConstructionMethod } from './base'

export class MonolithicConstructionMethod extends BaseSlabConstructionMethod<MonolithicSlabConstructionConfig> {
  construct = (polygon: PolygonWithHoles2D, config: MonolithicSlabConstructionConfig) => {
    const slab = createConstructionElement(
      config.material,
      createExtrudedPolygon(polygon, 'xy', config.thickness as Length),
      { position: [0, 0, -config.thickness], rotation: [0, 0, 0] },
      [TAG_SLAB]
    )
    return {
      elements: [slab],
      areas: [],
      warnings: [],
      errors: [],
      measurements: [],
      bounds: slab.bounds
    } as ConstructionModel
  }

  getTopOffset = (_config: MonolithicSlabConstructionConfig) => createLength(0)
  getBottomOffset = (_config: MonolithicSlabConstructionConfig) => createLength(0)
  getConstructionThickness = (config: MonolithicSlabConstructionConfig) => config.thickness
}
