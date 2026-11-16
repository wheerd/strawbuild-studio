import type { Opening } from '@/building/model'
import type { SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { ConstructionResult } from '@/construction/model/results'
import type { Length } from '@/shared/geometry'

import type { OpeningAssembly, OpeningAssemblyConfigBase } from './types'

export abstract class BaseOpeningAssembly<T extends OpeningAssemblyConfigBase> implements OpeningAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: SegmentInfillMethod,
    openings: Opening[]
  ): Generator<ConstructionResult>

  abstract getSegmentationPadding(openings: Opening[]): Length
  abstract needsWallStands(openings: Opening[]): boolean
}
