import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FLOOR } from '@/construction/tags'
import { fromTrans, newVec3 } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { MonolithicFloorConfig } from './types'

export class MonolithicFloorAssembly extends BaseFloorAssembly<MonolithicFloorConfig> {
  construct = (context: PerimeterConstructionContext, config: MonolithicFloorConfig) => {
    const floor = createConstructionElement(
      config.material,
      createExtrudedPolygon({ outer: context.outerPolygon, holes: context.floorOpenings }, 'xy', config.thickness),
      fromTrans(newVec3(0, 0, -config.thickness)),
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
