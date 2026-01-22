import type { Opening, OpeningAssemblyId } from '@/building/model'
import type { WallConstructionArea } from '@/construction/geometry'
import { BaseOpeningAssembly } from '@/construction/openings/base'
import { resolveOpeningAssembly } from '@/construction/openings/resolver'
import type { ThresholdAssemblyConfig } from '@/construction/openings/types'
import type { ConstructionResult } from '@/construction/results'
import type { SegmentInfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

export class ThresholdOpeningAssembly extends BaseOpeningAssembly<ThresholdAssemblyConfig> {
  *construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: SegmentInfillMethod
  ): Generator<ConstructionResult> {
    const openingWidth = area.size[0]
    const targetAssemblyId = this.selectAssemblyByWidth(openingWidth)
    const delegateAssembly = resolveOpeningAssembly(targetAssemblyId)
    yield* delegateAssembly.construct(area, adjustedHeader, adjustedSill, infill)
  }

  selectAssemblyByWidth(width: number): OpeningAssemblyId {
    const sorted = [...this.config.thresholds].sort((a, b) => a.widthThreshold - b.widthThreshold)
    const matchingThresholds = sorted.filter(t => width >= t.widthThreshold)
    if (matchingThresholds.length === 0) {
      return this.config.defaultId
    }
    const highestMatch = matchingThresholds[matchingThresholds.length - 1]
    return highestMatch.assemblyId
  }

  getSegmentationPadding(openings: Opening[]): number {
    const assemblyIds = [...new Set([this.config.defaultId, ...this.config.thresholds.map(t => t.assemblyId)])]
    const assemblies = assemblyIds.map(id => resolveOpeningAssembly(id))
    return Math.max(...assemblies.map(a => a.getSegmentationPadding(openings)))
  }

  needsWallStands(openings: Opening[]): boolean {
    const assemblyIds = [...new Set([this.config.defaultId, ...this.config.thresholds.map(t => t.assemblyId)])]
    const assemblies = assemblyIds.map(id => resolveOpeningAssembly(id))
    return assemblies.some(a => a.needsWallStands(openings))
  }
}
