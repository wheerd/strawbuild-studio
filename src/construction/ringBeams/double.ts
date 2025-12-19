import type { Perimeter } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { createUnsupportedModel } from '@/construction/model'

import type { DoubleRingBeamConfig, RingBeamAssembly } from './types'

export class DoubleRingBeamAssembly implements RingBeamAssembly {
  private config: DoubleRingBeamConfig

  constructor(config: DoubleRingBeamConfig) {
    this.config = config
  }

  get height() {
    return this.config.height
  }

  construct(_perimeter: Perimeter): ConstructionModel {
    return createUnsupportedModel('Double ring beam construction is not yet supported.', 'unsupported-ring-beam-double')
  }
}
