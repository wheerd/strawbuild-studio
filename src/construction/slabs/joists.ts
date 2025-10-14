import type { JoistSlabConstructionConfig } from '@/construction/config/types'
import { type PolygonWithHoles2D, createLength } from '@/shared/geometry'

import { BaseSlabConstructionMethod } from './base'

export class JoistConstructionMethod extends BaseSlabConstructionMethod<JoistSlabConstructionConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: JoistSlabConstructionConfig) => {
    throw new Error('TODO: Implement')
  }

  getTopOffset = (config: JoistSlabConstructionConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistSlabConstructionConfig) => createLength(0)
  getConstructionThickness = (config: JoistSlabConstructionConfig) => config.joistHeight
}
