import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult, yieldError } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'

import type { DoubleRingBeamConfig, RingBeamAssembly, RingBeamSegment } from './types'

export class DoubleRingBeamAssembly implements RingBeamAssembly {
  private config: DoubleRingBeamConfig

  constructor(config: DoubleRingBeamConfig) {
    this.config = config
  }

  get height() {
    return this.config.height
  }

  *construct(
    _segment: RingBeamSegment,
    _context: PerimeterConstructionContext,
    _storeyContext?: StoreyContext
  ): Generator<ConstructionResult> {
    yield yieldError('Double ring beam construction is not yet supported.', [], 'unsupported-ring-beam-double')
  }
}
