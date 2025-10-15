import { vec3 } from 'gl-matrix'

import type { MonolithicFloorAssemblyConfig } from '@/construction/config/types'
import { createConstructionElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_FLOOR } from '@/construction/tags'
import { type PolygonWithHoles2D } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'

export class MonolithicFloorAssembly extends BaseFloorAssembly<MonolithicFloorAssemblyConfig> {
  construct = (polygon: PolygonWithHoles2D, config: MonolithicFloorAssemblyConfig) => {
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

  getTopOffset = (_config: MonolithicFloorAssemblyConfig) => 0
  getBottomOffset = (_config: MonolithicFloorAssemblyConfig) => 0
  getConstructionThickness = (config: MonolithicFloorAssemblyConfig) => config.thickness
}
