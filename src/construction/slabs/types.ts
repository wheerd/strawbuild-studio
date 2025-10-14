import type { SlabBaseConstructionConfig } from '@/construction/config/types'
import type { ConstructionModel } from '@/construction/model'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'

export interface SlabConstructionMethod<TConfig extends SlabBaseConstructionConfig> {
  construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomOffset: (config: TConfig) => Length
  getConstructionThickness: (config: TConfig) => Length
  getTotalThickness: (config: TConfig) => Length
}
