import type { WallConstructionArea } from '@/construction/geometry'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import type { EmptyOpeningConfig } from '@/construction/openings/types'
import type { ConstructionResult } from '@/construction/results'
import type { SegmentInfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

export class EmptyOpeningAssembly extends BaseOpeningAssembly<EmptyOpeningConfig> {
  *construct(
    _area: WallConstructionArea,
    _adjustedHeader: Length,
    _adjustedSill: Length,
    _infill: SegmentInfillMethod
  ): Generator<ConstructionResult> {
    // Intentionally empty
  }

  getSegmentationPadding() {
    return 0
  }

  needsWallStands(): boolean {
    return true
  }
}
