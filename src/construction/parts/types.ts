import type { PerimeterId, RoofId, StoreyId, WallId } from '@/building/model/ids'
import type { ConstructionElementId } from '@/construction/elements'
import type { CrossSection, Material, MaterialId } from '@/construction/materials/material'
import type { Area, Length, PolygonWithHoles2D, Vec3, Volume } from '@/shared/geometry'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'

export type PartId = string & { readonly brand: unique symbol }

export interface SideFace {
  index: number // The index of the side this is for with respect to boxSize
  polygon: PolygonWithHoles2D // Normalized to fit within [0,0] to [side width,side height]
}

export interface FullPartInfo {
  id: PartId
  type: string
  subtype?: string
  description?: TranslatableString
  boxSize: Vec3
  sideFaces?: SideFace[]
  requiresSinglePiece?: boolean
}

export interface InitialPartInfo {
  type: string
  subtype?: string
  description?: TranslatableString
  requiresSinglePiece?: boolean
}

export type PartInfo = InitialPartInfo | FullPartInfo

export type PartIssue = 'CrossSectionMismatch' | 'LengthExceedsAvailable' | 'ThicknessMismatch' | 'SheetSizeExceeded'

export type StrawCategory = 'full' | 'partial' | 'flakes' | 'stuffed'

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
  length?: Length
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

export interface PartsFilter extends LocationFilter {
  virtual?: boolean
}

export interface AggregatedPartItem extends PartDefinition {
  label: string
  quantity: number
  elementIds: ConstructionElementId[]
  totalVolume: Volume
  totalArea?: Area
  totalLength?: Length
}

export interface PartsStoreState {
  definitions: Record<PartId, PartDefinition>
  occurrences: PartOccurrence[]

  labels: Record<PartId, string>
  usedLabelsByGroup: Record<string, string[]>
  nextLabelIndexByGroup: Record<string, number>

  hasParts: boolean
  rebuilding: boolean
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
