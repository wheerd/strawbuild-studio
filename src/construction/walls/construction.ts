import type { PerimeterCornerId } from '@/building/model/ids'
import type { OpeningType, Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import type { StrawConfig } from '@/construction/materials/straw'
import type { OpeningConstructionConfig } from '@/construction/openings/openings'
import type { Length } from '@/shared/geometry'

import type { ConstructionModel } from '../model'

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
) => ConstructionModel

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
