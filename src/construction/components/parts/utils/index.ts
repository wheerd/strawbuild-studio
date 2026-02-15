import type { Material } from '@/construction/materials/material'
import type { AggregatedPartItem, PartId } from '@/construction/parts/types'
import type { Volume } from '@/shared/geometry'

export const calculateWeight = (volume: Volume, material: Material): number | undefined => {
  if (material.density == null) return undefined
  return (volume * material.density) / 1_000_000_000
}

export const getIssueSeverity = (part: AggregatedPartItem): 'error' | 'warning' | undefined => {
  if (!part.issue) return undefined

  // Size-related issues can be warnings if multiple pieces are allowed
  if (part.issue === 'LengthExceedsAvailable' || part.issue === 'SheetSizeExceeded') {
    return part.requiresSinglePiece ? 'error' : 'warning'
  }

  // Other issues (CrossSectionMismatch, ThicknessMismatch) are always errors
  return 'error'
}

export const canHighlightPart = (partId: PartId): boolean => !partId.startsWith('auto_')
