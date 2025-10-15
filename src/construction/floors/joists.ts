import { createUnsupportedModel } from '@/construction/model'
import { type PolygonWithHoles2D } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { JoistFloorAssemblyConfig } from './types'

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorAssemblyConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: JoistFloorAssemblyConfig) => {
    // TODO: Implement joist floor assemly.
    return createUnsupportedModel('Joist floor assemly is not yet supported.', 'unsupported-floor-joist')
  }

  getTopOffset = (config: JoistFloorAssemblyConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorAssemblyConfig) => 0
  getConstructionThickness = (config: JoistFloorAssemblyConfig) => config.joistHeight
}
