import { vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FLOOR } from '@/construction/tags'
import { type PolygonWithHoles2D } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { MonolithicFloorConfig } from './types'

export class MonolithicFloorAssembly extends BaseFloorAssembly<MonolithicFloorConfig> {
  construct = (polygon: PolygonWithHoles2D, config: MonolithicFloorConfig) => {
    const floor = createConstructionElement(
      config.material,
      createExtrudedPolygon(polygon, 'xy', config.thickness),
      { position: [0, 0, -config.thickness], rotation: vec3.fromValues(0, 0, 0) },
      [TAG_FLOOR]
    )
    return {
      elements: [floor],
      areas: [],
      warnings: [],
      errors: [],
      measurements: [],
      bounds: floor.bounds
    } as ConstructionModel
  }

  getTopOffset = (_config: MonolithicFloorConfig) => 0
  getBottomOffset = (_config: MonolithicFloorConfig) => 0
  getConstructionThickness = (config: MonolithicFloorConfig) => config.thickness
}
