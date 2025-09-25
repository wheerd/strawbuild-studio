import type { PerimeterCornerId, PerimeterWallId } from '@/building/model/ids'
import type { OpeningType, Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import type { ConstructionElement } from '@/construction/elements'
import type { StrawConfig } from '@/construction/materials/straw'
import type { Measurement } from '@/construction/measurements'
import type { OpeningConstruction, OpeningConstructionConfig } from '@/construction/openings/openings'
import type { ConstructionIssue } from '@/construction/results'
import type { Length } from '@/shared/geometry'

export type ConstructionType = 'infill' | 'strawhenge' | 'non-strawbale'

export interface BaseConstructionConfig {
  type: ConstructionType
  openings: Record<OpeningType, OpeningConstructionConfig>
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: TConfig,
  layers: LayersConfig
) => WallConstructionPlan

export interface WallCornerInfo {
  startCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  } | null

  endCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  } | null
}

export interface WallConstructionPlan {
  wallId: PerimeterWallId
  constructionType: ConstructionType
  wallDimensions: {
    length: Length // The ACTUAL construction length (includes assigned corners)
    boundaryLength: Length // The original wall boundary length
    thickness: Length
    height: Length
  }

  segments: ConstructionSegment[]
  measurements: Measurement[]
  cornerInfo: WallCornerInfo

  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export interface BaseConstructionSegment {
  id: string
  type: 'wall' | 'opening'
  position: Length
  width: Length
  elements: ConstructionElement[]
}

export interface WallConstructionSegment extends BaseConstructionSegment {
  type: 'wall'
  constructionType: ConstructionType
}

// Note: OpeningConstruction is defined in @/construction/openings/openings
// We'll re-export it via the index to make it available alongside other construction types
export type ConstructionSegment = WallConstructionSegment | OpeningConstruction
