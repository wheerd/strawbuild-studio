import type { PerimeterCornerId } from '@/building/model/ids'
import type { Perimeter, PerimeterWall } from '@/building/model/model'
import type { WallLayersConfig } from '@/construction/config/types'
import type { StrawConfig } from '@/construction/materials/straw'
import type { ConstructionModel } from '@/construction/model'
import type { OpeningConstructionConfig } from '@/construction/openings/openings'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { Length } from '@/shared/geometry'

export type ConstructionType = 'infill' | 'strawhenge' | 'non-strawbale' | 'modules'

export interface BaseConstructionConfig {
  type: ConstructionType
  openings: OpeningConstructionConfig
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  config: TConfig,
  layers: WallLayersConfig
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
