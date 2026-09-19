import type { InteriorWallAssemblyConfig } from '@/config/types'
import type { ConstructionModel } from '@/construction/model/model'
import { createTag } from '@/construction/model/tags'
import { Bounds3D } from '@/shared/geometry'

import { MonolithicInteriorWallAssembly } from './monolithic'
import type { InteriorWallAssembly } from './types'

const emptyModel = (): ConstructionModel => ({
  elements: [],
  measurements: [],
  areas: [],
  errors: [],
  warnings: [],
  bounds: Bounds3D.EMPTY
})

class EmptyInteriorWallAssembly implements InteriorWallAssembly {
  private readonly config: InteriorWallAssemblyConfig

  constructor(config: InteriorWallAssemblyConfig) {
    this.config = config
  }

  construct(): ConstructionModel {
    return emptyModel()
  }

  get tags() {
    const nameKey = this.config.nameKey
    return [
      createTag('wall-assembly', this.config.id, nameKey != null ? t => t(nameKey, { ns: 'config' }) : this.config.name)
    ]
  }
}

export function resolveInteriorWallAssembly(config: InteriorWallAssemblyConfig): InteriorWallAssembly {
  if (config.type !== 'monolithic') return new EmptyInteriorWallAssembly(config)
  return new MonolithicInteriorWallAssembly(config)
}
