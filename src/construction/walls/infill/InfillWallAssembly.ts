import type { Perimeter, PerimeterWall } from '@/building/model'
import type { ConstructionModel } from '@/construction/model'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { InfillWallAssemblyConfig, WallAssembly } from '@/construction/walls/types'

import { type InfillConstructionConfig, constructInfillWall } from './infill'

export class InfillWallAssembly implements WallAssembly<InfillWallAssemblyConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: InfillWallAssemblyConfig
  ): ConstructionModel {
    const constructionConfig: InfillConstructionConfig = {
      type: 'infill',
      openings: config.openings,
      straw: config.straw,
      maxPostSpacing: config.maxPostSpacing,
      minStrawSpace: config.minStrawSpace,
      posts: config.posts
    }
    return constructInfillWall(wall, perimeter, storeyContext, constructionConfig, config.layers)
  }
}
