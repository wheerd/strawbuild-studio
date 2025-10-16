import type { Perimeter } from '@/building/model/model'
import type { ConstructionModel } from '@/construction/model'
import { createUnsupportedModel } from '@/construction/model'

import type { DoubleRingBeamAssemblyConfig, RingBeamAssembly } from './types'

export class DoubleRingBeamAssembly implements RingBeamAssembly<DoubleRingBeamAssemblyConfig> {
  construct(_perimeter: Perimeter, _config: DoubleRingBeamAssemblyConfig): ConstructionModel {
    return createUnsupportedModel('Double ring beam construction is not yet supported.', 'unsupported-ring-beam-double')
  }
}
