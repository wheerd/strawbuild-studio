import type { PerimeterWall } from '@/model'
import type { Length } from '@/types/geometry'
import type { PostConfig } from './posts'
import type { PerimeterWallConstructionMethod, WallConstructionPlan } from './base'

export interface InfillConstructionConfig {
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export const constructInfillWall: PerimeterWallConstructionMethod<InfillConstructionConfig> = (
  _wall: PerimeterWall,
  _floorHeight: Length,
  _config: InfillConstructionConfig
): WallConstructionPlan => {
  throw new Error('TODO: Implementation')
}
