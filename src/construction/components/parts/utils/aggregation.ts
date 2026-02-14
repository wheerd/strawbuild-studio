import { merge, sum } from 'd3-array'
import * as d3 from 'd3-array'
import type { Namespace, TFunction } from 'i18next'

import { calculateWeight } from '@/construction/components/parts/utils'
import type { Material, MaterialType, StrawbaleMaterial } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { AggregatedPartItem, StrawCategory } from '@/construction/parts/types'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'
import { formatDimensions2D, formatLength } from '@/shared/i18n/formatters'

const MATERIAL_TYPE_ORDER: MaterialType[] = ['strawbale', 'dimensional', 'sheet', 'volume', 'generic']

export function groupKey(part: AggregatedPartItem): string {
  const sortKey = part.materialType ? MATERIAL_TYPE_ORDER.indexOf(part.materialType) : 'X'
  const groupKey = part.materialId ?? (part.subtype ? `${part.type}|${part.subtype}` : part.type)
  return `${sortKey}|${groupKey}`
}

export function virtualGroupKey(part: AggregatedPartItem): string {
  return part.subtype ? `${part.type}|${part.subtype}` : part.type
}

export function subGroupKey(part: AggregatedPartItem): string | null {
  switch (part.materialType) {
    case 'dimensional': {
      if (part.crossSection) {
        const sortValue = part.crossSection.smallerLength * part.crossSection.biggerLength
        const sortKey = sortValue.toFixed(0).padStart(20, '0')
        return `dimensional:${sortKey}:${part.crossSection.smallerLength}x${part.crossSection.biggerLength}`
      }
      return 'dimensional:other'
    }
    case 'sheet':
      if (part.thickness) {
        const sortKey = part.thickness.toFixed(0).padStart(20, '0')
        return `sheet:${sortKey}`
      }
      return 'sheet:other'
  }

  return null
}

export interface RowMetrics {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
  totalArea?: number
  totalWeight?: number
}

export interface SummaryMetrics extends RowMetrics {
  distinctCount: number
  parts: AggregatedPartItem[]
}

export function summarizeParts(parts: AggregatedPartItem[]): SummaryMetrics {
  const materialId = parts[0]?.materialId
  const material = materialId ? getMaterialById(materialId) : null

  if (material?.type === 'strawbale') {
    const strawSummary = summarizeStrawbaleParts(parts, material)
    return {
      totalQuantity: strawSummary.totalEstimatedBalesMax,
      totalVolume: strawSummary.totalVolume,
      totalLength: undefined,
      totalArea: undefined,
      totalWeight: calculateWeight(strawSummary.totalVolume, material),
      distinctCount: parts.length,
      parts
    }
  }
  return {
    distinctCount: parts.length,
    totalQuantity: sum(parts, p => p.quantity),
    totalVolume: sum(parts, p => p.totalVolume),
    totalLength: sum(parts, p => p.totalLength),
    totalArea: sum(parts, p => p.totalArea),
    totalWeight: material ? sum(parts, p => calculateWeight(p.totalVolume, material)) : undefined,
    parts
  }
}

export function summarizeSummary(summaries: SummaryMetrics[]): SummaryMetrics {
  return {
    distinctCount: sum(summaries, p => p.distinctCount),
    totalQuantity: sum(summaries, p => p.totalQuantity),
    totalVolume: sum(summaries, p => p.totalVolume),
    totalLength: sum(summaries, p => p.totalLength),
    totalArea: sum(summaries, p => p.totalArea),
    totalWeight: sum(summaries, p => p.totalWeight),
    parts: merge(summaries.map(s => s.parts))
  }
}

export interface MaterialGroup extends SummaryMetrics {
  material: Material
  key: string
  subGroups: PartSubGroup[]
}

export interface PartSubGroup extends SummaryMetrics {
  key: string
  badgeLabel: TranslatableString
  issueMessage?: TranslatableString
  parts: AggregatedPartItem[]
}

export function toMaterialGroup(entries: [string | null, AggregatedPartItem[]][]): MaterialGroup | null {
  const materialId = entries[0][1][0].materialId
  const material = materialId ? getMaterialById(materialId) : null
  if (material == null) return null
  const summaries = entries.map(([k, v]) => [k, summarizeParts(v)] as const)
  const summary = summarizeSummary(summaries.map(s => s[1]))
  const subGroups = summaries.map(s => toSubGroup(material, s)).filter(g => g != null)
  return { key: material.id, material, subGroups, ...summary }
}

export function toSubGroup(
  material: Material,
  summaryWithKey: readonly [string | null, SummaryMetrics]
): PartSubGroup | null {
  const [key, summary] = summaryWithKey
  const part = summary.parts[0]

  let badgeLabel: TranslatableString = ''
  let issueMessage: TranslatableString | undefined
  switch (material.type) {
    case 'dimensional':
      {
        const crossSection = part.crossSection
        badgeLabel = crossSection
          ? (_t, locale) => formatDimensions2D([crossSection.smallerLength, crossSection.biggerLength], true, locale)
          : t => t($ => $.partsList.other.crossSections, { ns: 'construction' })
        const isDefined = material.crossSections.some(
          cs => cs.smallerLength === crossSection?.smallerLength && cs.biggerLength === crossSection.biggerLength
        )
        if (!isDefined) {
          issueMessage = t => t($ => $.partsList.other.crossSectionMismatch, { ns: 'construction' })
        }
      }
      break
    case 'sheet':
      {
        const thickness = part.thickness
        badgeLabel =
          thickness != null
            ? (_t, locale) => formatLength(thickness, locale)
            : t => t($ => $.partsList.other.thicknesses, { ns: 'construction' })
        const isDefined = material.thicknesses.includes(thickness ?? -1)
        if (!isDefined) {
          issueMessage = t => t($ => $.partsList.other.thicknessMismatch, { ns: 'construction' })
        }
      }
      break
  }

  return {
    key: `${material.id}:${key}`,
    badgeLabel,
    issueMessage,
    ...summary
  }
}

export function groupSortCmp<NS extends Namespace>(t: TFunction<NS>): (a: MaterialGroup, b: MaterialGroup) => number {
  return (a, b) => {
    // Sort by type first
    const typeA = a.material.type
    const typeB = b.material.type
    if (typeA !== typeB) {
      const orderA = MATERIAL_TYPE_ORDER.indexOf(typeA)
      const orderB = MATERIAL_TYPE_ORDER.indexOf(typeB)
      return orderA - orderB
    }
    // Then sort by name
    const nameKeyA = a.material.nameKey
    const nameKeyB = b.material.nameKey
    const nameA = nameKeyA ? t($ => $.materials.defaults[nameKeyA], { ns: 'config' }) : a.material.name
    const nameB = nameKeyB ? t($ => $.materials.defaults[nameKeyB], { ns: 'config' }) : a.material.name
    return nameA.localeCompare(nameB)
  }
}

interface StrawSummary {
  buckets: Record<StrawCategory, { volume: number; count: number }>
  nominalMaxVolume: number
  nominalMinVolume: number
  minRemainingBaleCount: number
  maxRemainingBaleCount: number
  remainingVolumeMin: number
  remainingVolumeMax: number
  totalEstimatedBalesMax: number
  totalVolume: number
}

export const ceilDiv = (value: number, divisor: number) => {
  if (value <= 0 || divisor <= 0) return 0
  return Math.ceil(value / divisor)
}

const floorDiv = (value: number, divisor: number) => {
  if (value <= 0 || divisor <= 0) return 0
  return Math.floor(value / divisor)
}

export const summarizeStrawbaleParts = (parts: AggregatedPartItem[], material: StrawbaleMaterial): StrawSummary => {
  const buckets: Record<StrawCategory, { volume: number; count: number }> = {
    full: { volume: 0, count: 0 },
    partial: { volume: 0, count: 0 },
    flakes: { volume: 0, count: 0 },
    stuffed: { volume: 0, count: 0 }
  }

  for (const part of parts) {
    const category: StrawCategory = part.strawCategory ?? 'stuffed'
    buckets[category].volume += part.totalVolume
    buckets[category].count += part.quantity
  }

  const nominalMaxVolume = material.baleHeight * material.baleWidth * material.baleMaxLength
  const nominalMinVolume = Math.max(material.baleHeight * material.baleWidth * material.baleMinLength, 1)
  const totalVolume = d3.sum(Object.values(buckets), b => b.volume)

  const partialBucket = buckets.partial
  const expectedPartialVolumeMin = partialBucket.count * nominalMinVolume
  const expectedPartialVolumeMax = partialBucket.count * nominalMaxVolume
  const remainingVolumeMin = Math.max(expectedPartialVolumeMin - partialBucket.volume, 0)
  const remainingVolumeMax = Math.max(expectedPartialVolumeMax - partialBucket.volume, 0)

  const remainingBaleCount1 = floorDiv(remainingVolumeMin, nominalMinVolume)
  const remainingBaleCount2 = floorDiv(remainingVolumeMax, nominalMaxVolume)

  const minRemainingBaleCount = Math.min(remainingBaleCount1, remainingBaleCount2)
  const maxRemainingBaleCount = Math.max(remainingBaleCount1, remainingBaleCount2)

  const totalEstimatedBalesMax =
    buckets.full.count +
    buckets.partial.count -
    minRemainingBaleCount +
    ceilDiv(buckets.flakes.volume, nominalMaxVolume) +
    ceilDiv(buckets.stuffed.volume, nominalMaxVolume)

  return {
    buckets,
    nominalMaxVolume,
    nominalMinVolume,
    minRemainingBaleCount,
    maxRemainingBaleCount,
    remainingVolumeMin,
    remainingVolumeMax,
    totalEstimatedBalesMax,
    totalVolume
  }
}

export interface VirtualGroup extends SummaryMetrics {
  key: string
  type: string
  subtype?: string
  description?: TranslatableString
}

export function toVirtualGroup(parts: AggregatedPartItem[]): VirtualGroup {
  const first = parts[0]
  return {
    key: virtualGroupKey(first),
    type: first.type,
    subtype: first.subtype,
    description: first.description,
    ...summarizeVirtualParts(parts)
  }
}

function summarizeVirtualParts(parts: AggregatedPartItem[]): SummaryMetrics {
  return {
    distinctCount: parts.length,
    totalQuantity: sum(parts, p => p.quantity),
    totalVolume: sum(parts, p => p.totalVolume),
    totalLength: sum(parts, p => p.totalLength),
    totalArea: sum(parts, p => p.totalArea),
    totalWeight: undefined,
    parts
  }
}
