import type { Perimeter, PerimeterWall } from '@/building/model'
import type { ConstructionModel } from '@/construction/model'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { StrawhengeWallAssemblyConfig, WallAssembly } from '@/construction/walls/types'

import { type StrawhengeConstructionConfig, constructStrawhengeWall } from './strawhenge'

export class StrawhengeWallAssembly implements WallAssembly<StrawhengeWallAssemblyConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: StrawhengeWallAssemblyConfig
  ): ConstructionModel {
    const constructionConfig: StrawhengeConstructionConfig = {
      type: 'strawhenge',
      openings: config.openings,
      straw: config.straw,
      module: config.module,
      infill: {
        type: 'infill',
        openings: config.openings,
        straw: config.straw,
        maxPostSpacing: config.infill.maxPostSpacing,
        minStrawSpace: config.infill.minStrawSpace,
        posts: config.infill.posts
      }
    }
    return constructStrawhengeWall(wall, perimeter, storeyContext, constructionConfig, config.layers)
  }
}
