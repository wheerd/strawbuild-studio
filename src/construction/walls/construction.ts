import type { PerimeterCornerId } from '@/building/model/ids'
import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import type { StrawConfig } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import type { OpeningConstructionConfig } from '@/construction/openings/openings'
import type { Length } from '@/shared/geometry'

export type ConstructionType = 'infill' | 'strawhenge' | 'non-strawbale'

export interface BaseConstructionConfig {
  type: ConstructionType
  openings: OpeningConstructionConfig
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  floorHeight: Length,
  config: TConfig,
  layers: LayersConfig
) => ConstructionModel

export interface WallCornerInfo {
  startCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  endCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  extensionStart: Length
  constructionLength: Length
  extensionEnd: Length
}
