import type { WallConstructionArea } from '@/construction/geometry'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import type { EmptyOpeningConfig } from '@/construction/openings/types'
import type { ConstructionResult } from '@/construction/results'
import type { InfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

export class EmptyOpeningAssembly extends BaseOpeningAssembly<EmptyOpeningConfig> {
  *construct(
    _area: WallConstructionArea,
    _adjustedHeader: Length,
    _adjustedSill: Length,
    _infill: InfillMethod
  ): Generator<ConstructionResult> {
    // Intentionally empty
  }

  readonly segmentationPadding = 0 as Length
  readonly needsWallStands = true
}
