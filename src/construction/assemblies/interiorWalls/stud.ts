import type { IntermediateWallWithGeometry, OpeningWithGeometry } from '@/building/model'
import type { StudWallAssemblyConfig } from '@/config/types'
import { BaseInteriorWallAssembly } from '@/construction/assemblies/interiorWalls/base'
import { constructInteriorWallSegments } from '@/construction/assemblies/interiorWalls/segmentation'
import { constructStudWallSegment } from '@/construction/assemblies/interiorWalls/studs'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import { type ConstructionResult } from '@/construction/model/results'
import { TAG_BASE_PLATE, TAG_STUD_WALL, TAG_TOP_PLATE, TAG_WALL_PLANKING } from '@/construction/model/tags'
import { type Polygon2D } from '@/shared/geometry'

import type { WallExtension } from './geometry'

export class StudInteriorWallAssembly extends BaseInteriorWallAssembly<StudWallAssemblyConfig> {
  readonly assemblyTypeTag = TAG_STUD_WALL

  protected area!: WallConstructionArea

  protected *constructCore(
    wall: IntermediateWallWithGeometry,
    area: WallConstructionArea,
    _openings: OpeningWithGeometry[],
    _openingHoles: Polygon2D[],
    _storeyContext: StoreyContext,
    _perimeterContext: PerimeterConstructionContext,
    _extension: WallExtension
  ): Generator<ConstructionResult> {
    this.area = area

    yield* this.constructPlanking()
    yield* this.constructSolePlate()
    yield* this.constructHeadPlate()
    yield* this.constructFramedCore(wall)
  }

  protected *constructPlanking(): Generator<ConstructionResult> {
    const { plankMaterial, plankThickness } = this.config

    if (!plankMaterial) return

    let leftPlank, rightPlank
    ;[leftPlank, this.area] = this.area.splitInY(plankThickness)
    ;[this.area, rightPlank] = this.area.splitInY(this.area.size[1] - plankThickness)

    yield* leftPlank.yieldExtrudeWithHoles(plankMaterial, [TAG_WALL_PLANKING])
    yield* rightPlank.yieldExtrudeWithHoles(plankMaterial, [TAG_WALL_PLANKING])
  }

  protected *constructSolePlate(): Generator<ConstructionResult> {
    const { solePlateMaterial, solePlateThickness } = this.config

    if (!solePlateMaterial) return

    let solePlate
    ;[solePlate, this.area] = this.area.splitInZ(solePlateThickness)

    yield* solePlate.yieldExtrudeWithHoles(solePlateMaterial, [TAG_BASE_PLATE])
  }

  protected *constructHeadPlate(): Generator<ConstructionResult> {
    const { headPlateMaterial, headPlateThickness } = this.config

    if (!headPlateMaterial) return

    let headPlate
    ;[headPlate, this.area] = this.area.splitAtTop(headPlateThickness)

    for (const headPlatePart of headPlate.splitAtHeightJumps()) {
      yield* headPlatePart.yieldExtrudeWithHoles(headPlateMaterial, [TAG_TOP_PLATE])
    }
  }

  protected *constructFramedCore(wall: IntermediateWallWithGeometry): Generator<ConstructionResult> {
    const segment = (segmentArea: WallConstructionArea, starts: boolean, ends: boolean) =>
      constructStudWallSegment(segmentArea, this.config, starts, ends)
    const infill = (infillArea: WallConstructionArea) => constructStudWallSegment(infillArea, this.config, false, false)
    yield* constructInteriorWallSegments(wall, this.area, true, true, segment, infill, this.config.openingAssemblyId)
  }
}
