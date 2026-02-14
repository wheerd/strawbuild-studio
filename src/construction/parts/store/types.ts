import type { PerimeterId, RoofId, StoreyId, WallId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { CrossSection, Material, MaterialId } from '@/construction/materials/material'
import type { PartId, PartIssue, SideFace, StrawCategory } from '@/construction/parts/types'
import type { Area, Length, Vec3, Volume } from '@/shared/geometry'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'

export interface PartDefinition {
  partId: PartId
  materialId?: MaterialId
  materialType?: Material['type']
  source: 'element' | 'group'
  type: string
  subtype?: string
  description?: TranslatableString
  strawCategory?: StrawCategory
  issue?: PartIssue
  size: Vec3
  volume: Volume
  area?: Area
  crossSection?: CrossSection
  thickness?: Length
  sideFaces?: SideFace[]
  requiresSinglePiece?: boolean
}

export interface PartOccurrence {
  elementId: ConstructionElementId
  partId: PartId
  virtual: boolean
  storeyId?: StoreyId
  perimeterId?: PerimeterId
  wallId?: WallId
  roofId?: RoofId
}

export interface LocationFilter {
  storeyId?: StoreyId
  perimeterId?: PerimeterId
  wallId?: WallId
  roofId?: RoofId
}

export interface PartsStoreState {
  definitions: Record<PartId, PartDefinition>
  occurrences: PartOccurrence[]

  labels: Record<PartId, string>
  usedLabelsByGroup: Record<string, string[]>
  nextLabelIndexByGroup: Record<string, number>

  hasParts: boolean
  generatedAt: number
}

export interface PartsStoreActions {
  rebuildParts(): void
  resetLabels(groupId?: string): void
  getFilteredOccurrences(filter: LocationFilter): PartOccurrence[]
}

export type PartsStore = PartsStoreState & {
  actions: PartsStoreActions
}
