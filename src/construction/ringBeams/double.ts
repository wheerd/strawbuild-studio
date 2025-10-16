import type { Perimeter } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { createUnsupportedModel } from '@/construction/model'

import type { DoubleRingBeamConfig, RingBeamAssembly } from './types'

export class DoubleRingBeamAssembly implements RingBeamAssembly<DoubleRingBeamConfig> {
  construct(_perimeter: Perimeter, _config: DoubleRingBeamConfig): ConstructionModel {
    return createUnsupportedModel('Double ring beam construction is not yet supported.', 'unsupported-ring-beam-double')
  }
}
