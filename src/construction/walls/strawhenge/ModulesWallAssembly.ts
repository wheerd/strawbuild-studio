import type { Perimeter, PerimeterWall } from '@/building/model'
import type { ConstructionModel } from '@/construction/model'
import type { WallStoreyContext } from '@/construction/walls/segmentation'
import type { ModulesWallAssemblyConfig, WallAssembly } from '@/construction/walls/types'

import { type ModulesConstructionConfig, constructModuleWall } from './all-modules'

export class ModulesWallAssembly implements WallAssembly<ModulesWallAssemblyConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: ModulesWallAssemblyConfig
  ): ConstructionModel {
    const constructionConfig: ModulesConstructionConfig = {
      type: 'modules',
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
    return constructModuleWall(wall, perimeter, storeyContext, constructionConfig, config.layers)
  }
}
