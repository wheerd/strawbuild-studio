import type { FloorAssembly } from '@/construction/floors/types'
import type { ConstructionModel } from '@/construction/model'
import { type Length, type PolygonWithHoles2D } from '@/shared/geometry'

import type { FloorAssemblyBaseConfig } from './types'

export abstract class BaseFloorAssembly<TConfig extends FloorAssemblyBaseConfig> implements FloorAssembly<TConfig> {
  abstract construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel
  abstract getTopOffset: (config: TConfig) => Length
  abstract getBottomOffset: (config: TConfig) => Length
  abstract getConstructionThickness: (config: TConfig) => Length

  getTotalThickness = (config: TConfig) =>
    config.layers.topThickness +
    this.getTopOffset(config) +
    this.getConstructionThickness(config) +
    this.getBottomOffset(config) +
    config.layers.bottomThickness
}
