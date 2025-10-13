import type { FloorBaseConstructionConfig, FloorConstructionType } from '@/construction/config/types'
import { CltConstructionMethod } from '@/construction/floors/clt'
import { JoistConstructionMethod } from '@/construction/floors/joists'
import type { ConstructionModel } from '@/construction/model'
import { type Length, type PolygonWithHoles2D, createLength } from '@/shared/geometry'

export interface FloorConstructionMethod<TConfig extends FloorBaseConstructionConfig> {
  construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}

export abstract class BaseFloorConstructionMethod<TConfig extends FloorBaseConstructionConfig>
  implements FloorConstructionMethod<TConfig>
{
  abstract construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel
  abstract getTopOffset: (config: TConfig) => Length
  abstract getBottomOffset: (config: TConfig) => Length
  abstract getConstructionThickness: (config: TConfig) => Length

  getTotalThickness = (config: TConfig) =>
    createLength(
      config.layers.topThickness +
        this.getTopOffset(config) +
        this.getConstructionThickness(config) +
        this.getBottomOffset(config) +
        config.layers.bottomThickness
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLOOR_CONSTRUCTION_METHODS: Record<FloorConstructionType, FloorConstructionMethod<any>> = {
  clt: new CltConstructionMethod(),
  joist: new JoistConstructionMethod()
}
