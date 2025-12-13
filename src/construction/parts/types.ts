import type { vec3 } from 'gl-matrix'

import type { ConstructionElementId } from '@/construction/elements'
import type { CrossSection, MaterialId } from '@/construction/materials/material'
import type { Area, Length, PolygonWithHoles2D, Volume } from '@/shared/geometry'

export type PartId = string & { readonly brand: unique symbol }

export interface SideFace {
  index: number // The index of the side this is for with respect to boxSize
  polygon: PolygonWithHoles2D // Normalized to fit within [0,0] to [side width,side height]
}

export interface FullPartInfo {
  id: PartId
  type: string
  description?: string
  boxSize: vec3
  sideFaces?: SideFace[]
}

export interface InitialPartInfo {
  type: string
  subtype?: string
  description?: string
}

export type PartInfo = InitialPartInfo | FullPartInfo

export interface MaterialParts {
  material: MaterialId
  totalQuantity: number
  totalVolume: Volume
  totalArea?: Length
  totalLength?: Length
  parts: Record<PartId, MaterialPartItem>
  usages: Record<PartId, MaterialPartItem>
}

export interface PartItem {
  partId: PartId
  type: string
  description?: string
  label: string // A, B, C, ...
  size: vec3
  elements: ConstructionElementId[]
  quantity: number
}

export type PartIssue = 'CrossSectionMismatch' | 'LengthExceedsAvailable' | 'ThicknessMismatch' | 'SheetSizeExceeded'

export type StrawCategory = 'full' | 'partial' | 'flakes' | 'stuffed'

export interface MaterialPartItem extends PartItem {
  material: MaterialId
  totalVolume: Volume
  area?: Length
  totalArea?: Length
  length?: Length
  totalLength?: Length
  crossSection?: CrossSection
  thickness?: Length
  strawCategory?: StrawCategory
  sideFaces?: SideFace[]
  issue?: PartIssue
}

export interface MaterialUsage {
  key: string
  type: string
  label: string // A, B, C, ...
  totalVolume: Volume
  totalArea?: Area
}

export type MaterialPartsList = Record<MaterialId, MaterialParts>
export type VirtualPartsList = Record<PartId, PartItem>
