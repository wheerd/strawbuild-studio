import type { PerimeterConstructionContext } from '@/construction/context'
import { type ConstructionResult } from '@/construction/results'
import { TAG_PLATE } from '@/construction/tags'

import { BaseRingBeamAssembly } from './base'
import type { FullRingBeamConfig, RingBeamSegment } from './types'

export class FullRingBeamAssembly extends BaseRingBeamAssembly<FullRingBeamConfig> {
  get height() {
    return this.config.height
  }

  *construct(segment: RingBeamSegment, context: PerimeterConstructionContext): Generator<ConstructionResult> {
    for (const polygon of this.polygons(segment, context, this.config.offsetFromEdge, this.config.width)) {
      yield* polygon.extrude(this.config.material, this.config.height, 'xy', undefined, [TAG_PLATE], {
        type: 'ring-beam'
      })
    }
  }
}
