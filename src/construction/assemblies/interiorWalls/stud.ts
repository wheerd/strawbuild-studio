import type { IntermediateWallWithGeometry, OpeningWithGeometry } from '@/building/model'
import type { MonolithicStudWallAssemblyConfig, PlankedStudWallAssemblyConfig } from '@/config/types'
import { BaseInteriorWallAssembly } from '@/construction/assemblies/interiorWalls/base'
import { constructInteriorWallSegments } from '@/construction/assemblies/interiorWalls/segmentation'
import { constructStudSegment } from '@/construction/assemblies/interiorWalls/studs'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionResult, yieldElement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import {
  TAG_LAYERS,
  TAG_MONOLITHIC_STUD_WALL,
  TAG_PLANKED_STUD_WALL,
  TAG_WALL_LAYER_INTERIOR
} from '@/construction/model/tags'
import { type Polygon2D, fromTrans, newVec3 } from '@/shared/geometry'

import type { WallExtension } from './geometry'

function* constructStudInfill(
  area: WallConstructionArea,
  config: MonolithicStudWallAssemblyConfig | PlankedStudWallAssemblyConfig
): Generator<ConstructionResult> {
  yield* constructStudSegment(area, config, true, true)
}

function* constructPlanking(
  area: WallConstructionArea,
  openingHoles: Polygon2D[],
  config: PlankedStudWallAssemblyConfig
): Generator<ConstructionResult> {
  if (config.plankThickness <= 0 || config.plankThickness * 2 > area.size[1]) return

  const polygon = {
    outer: area.getSideProfilePolygon(),
    holes: openingHoles
  }
  const shape = createExtrudedPolygon(polygon, 'xz', config.plankThickness)
  const tags = [TAG_WALL_LAYER_INTERIOR, TAG_LAYERS]
  const left = createConstructionElement(
    config.plankMaterial,
    shape,
    fromTrans(newVec3(0, area.position[1], 0)),
    tags,
    { type: 'wall-plank', requiresSinglePiece: true }
  )
  const right = createConstructionElement(
    config.plankMaterial,
    shape,
    fromTrans(newVec3(0, area.position[1] + area.size[1] - config.plankThickness, 0)),
    tags,
    { type: 'wall-plank', requiresSinglePiece: true }
  )
  yield* yieldElement(left)
  yield* yieldElement(right)
}

export class MonolithicStudInteriorWallAssembly extends BaseInteriorWallAssembly<MonolithicStudWallAssemblyConfig> {
  readonly assemblyTypeTag = TAG_MONOLITHIC_STUD_WALL

  protected *constructCore(
    wall: IntermediateWallWithGeometry,
    area: WallConstructionArea,
    _openings: OpeningWithGeometry[],
    _openingHoles: Polygon2D[],
    _storeyContext: StoreyContext,
    _perimeterContext: PerimeterConstructionContext,
    extension: WallExtension
  ): Generator<ConstructionResult> {
    const segment = (segmentArea: WallConstructionArea, starts: boolean, ends: boolean) =>
      constructStudSegment(segmentArea, this.config, starts, ends)
    const infill = (infillArea: WallConstructionArea) => constructStudInfill(infillArea, this.config)
    yield* constructInteriorWallSegments(
      wall,
      area,
      extension.startExtension,
      0,
      true,
      true,
      segment,
      infill,
      this.config.openingAssemblyId
    )
  }
}

export class PlankedStudInteriorWallAssembly extends BaseInteriorWallAssembly<PlankedStudWallAssemblyConfig> {
  readonly assemblyTypeTag = TAG_PLANKED_STUD_WALL

  protected *constructCore(
    wall: IntermediateWallWithGeometry,
    area: WallConstructionArea,
    _openings: OpeningWithGeometry[],
    openingHoles: Polygon2D[],
    _storeyContext: StoreyContext,
    _perimeterContext: PerimeterConstructionContext,
    extension: WallExtension
  ): Generator<ConstructionResult> {
    yield* constructPlanking(area, openingHoles, this.config)

    const studArea = area.withYAdjustment(this.config.plankThickness, area.size[1] - 2 * this.config.plankThickness)
    const segment = (segmentArea: WallConstructionArea, starts: boolean, ends: boolean) =>
      constructStudSegment(segmentArea, this.config, starts, ends)
    const infill = (infillArea: WallConstructionArea) => constructStudInfill(infillArea, this.config)
    yield* constructInteriorWallSegments(
      wall,
      studArea,
      extension.startExtension,
      0,
      true,
      true,
      segment,
      infill,
      this.config.openingAssemblyId
    )
  }
}
