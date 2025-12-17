import type { ConstructionModel } from '@/construction/model'
import { type Length } from '@/shared/geometry'

import type { FloorAssembly, FloorAssemblyConfigBase, PerimeterConstructionContext } from './types'

export abstract class BaseFloorAssembly<TConfig extends FloorAssemblyConfigBase> implements FloorAssembly<TConfig> {
  abstract construct: (context: PerimeterConstructionContext, config: TConfig) => ConstructionModel
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
