import type { PolygonWithHoles2D, Vec3 } from '@/shared/geometry'
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
