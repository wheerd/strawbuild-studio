import { type IntermediateWallWithGeometry, type OpeningWithGeometry } from '@/building/model'
import { resolveLayerSetThickness } from '@/config/store'
import type { MonolithicWallAssemblyConfig } from '@/config/types'
import { BaseInteriorWallAssembly } from '@/construction/assemblies/interiorWalls/base'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionResult, yieldElement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { TAG_MONOLITHIC_WALL } from '@/construction/model/tags'
import { type Polygon2D, fromTrans, newVec3, subtractPolygons } from '@/shared/geometry'

import type { WallExtension } from './geometry'

export class MonolithicInteriorWallAssembly extends BaseInteriorWallAssembly<MonolithicWallAssemblyConfig> {
  readonly assemblyTypeTag = TAG_MONOLITHIC_WALL

  protected *constructCore(
    wall: IntermediateWallWithGeometry,
    area: WallConstructionArea,
    _openings: OpeningWithGeometry[],
    openingHoles: Polygon2D[],
    _storeyContext: StoreyContext,
    _perimeterContext: PerimeterConstructionContext,
    _extension: WallExtension
  ): Generator<ConstructionResult> {
    const faceThickness = resolveLayerSetThickness(this.config.layerSetId)
    const coreThickness = wall.thickness - 2 * faceThickness

    const structuralPolygons = subtractPolygons([area.getSideProfilePolygon()], openingHoles)

    const structureShapes = structuralPolygons.map(p => createExtrudedPolygon(p, 'xz', coreThickness))
    const structureElements = structureShapes.map(s =>
      createConstructionElement(this.config.material, s, fromTrans(newVec3(0, area.position[1], 0)))
    )

    for (const element of structureElements) yield* yieldElement(element)
  }
}
