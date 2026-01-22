import type { Opening } from '@/building/model'
import type { WallConstructionArea } from '@/construction/geometry'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import { resolveOpeningAssembly } from '@/construction/openings/resolver'
import type { OpeningAssembly, ThresholdAssemblyConfig } from '@/construction/openings/types'
import type { ConstructionResult } from '@/construction/results'
import type { SegmentInfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

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

  private selectAssemblyByWidth(openings: Opening[]): OpeningAssembly {
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
