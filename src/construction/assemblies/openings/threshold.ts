import type { Opening } from '@/building/model'
import type { SegmentInfillMethod } from '@/construction/assemblies/perimeterWalls/types'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { ConstructionResult } from '@/construction/model/results'
import type { Length } from '@/shared/geometry'

import { resolveOpeningAssembly } from '.'
import { BaseOpeningAssembly } from './base'
import type { OpeningAssembly, ThresholdAssemblyConfig } from './types'

export class ThresholdOpeningAssembly extends BaseOpeningAssembly<ThresholdAssemblyConfig> {
  *construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: SegmentInfillMethod,
    openings: Opening[]
  ): Generator<ConstructionResult> {
    yield* this.selectAssemblyByWidth(openings).construct(area, adjustedHeader, adjustedSill, infill, openings)
  }

  protected selectAssemblyByWidth(openings: Opening[]): OpeningAssembly {
    const width = openings.map(o => o.width).reduce((a, b) => a + b, 0)
    const sorted = [...this.config.thresholds].sort((a, b) => a.widthThreshold - b.widthThreshold)
    const matchingThresholds = sorted.filter(t => width >= t.widthThreshold)
    const highestMatch =
      matchingThresholds.length === 0
        ? this.config.defaultId
        : matchingThresholds[matchingThresholds.length - 1].assemblyId
    const delegateAssembly = resolveOpeningAssembly(highestMatch)
    return delegateAssembly
  }

  getSegmentationPadding(openings: Opening[]): number {
    return this.selectAssemblyByWidth(openings).getSegmentationPadding(openings)
  }

  needsWallStands(openings: Opening[]): boolean {
    return this.selectAssemblyByWidth(openings).needsWallStands(openings)
  }
}
