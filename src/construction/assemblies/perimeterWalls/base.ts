import type { PerimeterWallWithGeometry } from '@/building/model'
import { getLayerSetById, resolveLayerSetThickness } from '@/config/store'
import {
  type AssemblyPhysicsStructure,
  type PhysicsParallel,
  type PhysicsSeries,
  layerToPhysicsParallel
} from '@/construction/assemblies/physics'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import type { Tag } from '@/construction/model/tags'
import type { ThicknessRange } from '@/materials/thickness'
import type { Length } from '@/shared/geometry'

import type { PerimeterWallAssembly, PerimeterWallBaseConfig } from './types'

export abstract class BaseWallAssembly<T extends PerimeterWallBaseConfig> implements PerimeterWallAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel

  abstract get tag(): Tag

  abstract get thicknessRange(): ThicknessRange

  abstract getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsSeries[]

  getPhysicsStructure(totalThickness: Length, height: Length): AssemblyPhysicsStructure {
    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)
    const coreThickness = totalThickness - insideThickness - outsideThickness
    return {
      inside: this.getInsidePhysicsLayers(),
      core: this.getCorePhysicsStructure(coreThickness, height),
      outside: this.getOutsidePhysicsLayers()
    }
  }

  protected getInsidePhysicsLayers(): PhysicsParallel[] {
    const layers = getLayerSetById(this.config.insideLayerSetId)?.layers ?? []
    if (layers.length === 0) return []
    return layers.map(layer => layerToPhysicsParallel(layer)).filter((p): p is PhysicsParallel => p !== null)
  }

  protected getOutsidePhysicsLayers(): PhysicsParallel[] {
    const layers = getLayerSetById(this.config.outsideLayerSetId)?.layers ?? []
    if (layers.length === 0) return []
    return layers.map(layer => layerToPhysicsParallel(layer)).filter((p): p is PhysicsParallel => p !== null)
  }
}
