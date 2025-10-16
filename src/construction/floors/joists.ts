import { createUnsupportedModel } from '@/construction/model'
import { type PolygonWithHoles2D } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { JoistFloorConfig } from './types'

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: JoistFloorConfig) => {
    // TODO: Implement joist floor assembly.
    return createUnsupportedModel('Joist floor assemly is not yet supported.', 'unsupported-floor-joist')
  }

  getTopOffset = (config: JoistFloorConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorConfig) => 0
  getConstructionThickness = (config: JoistFloorConfig) => config.joistHeight
}
