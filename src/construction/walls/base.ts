import type { Perimeter, PerimeterWall } from '@/building/model'
import type { ConstructionModel } from '@/construction/model'
import type { StoreyContext } from '@/construction/storeys/context'
import type { Tag } from '@/construction/tags'

import type { WallAssembly, WallBaseConfig } from './types'

export abstract class BaseWallAssembly<T extends WallBaseConfig> implements WallAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(wall: PerimeterWall, perimeter: Perimeter, storeyContext: StoreyContext): ConstructionModel

  abstract get tag(): Tag
}
