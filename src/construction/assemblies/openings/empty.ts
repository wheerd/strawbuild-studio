import { BaseOpeningAssembly } from '@/construction/assemblies/openings/base'
import type { EmptyOpeningConfig } from '@/construction/assemblies/openings/types'
import type { SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { ConstructionResult } from '@/construction/model/results'
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
