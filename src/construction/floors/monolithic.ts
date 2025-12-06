import { vec3 } from 'gl-matrix'

import { createConstructionElement } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FLOOR } from '@/construction/tags'

import { BaseFloorAssembly } from './base'
import type { FloorConstructionContext, MonolithicFloorConfig } from './types'

export class MonolithicFloorAssembly extends BaseFloorAssembly<MonolithicFloorConfig> {
  construct = (context: FloorConstructionContext, config: MonolithicFloorConfig) => {
    const floor = createConstructionElement(
      config.material,
      createExtrudedPolygon({ outer: context.outerPolygon, holes: context.openings }, 'xy', config.thickness),
      translate(vec3.fromValues(0, 0, -config.thickness)),
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
