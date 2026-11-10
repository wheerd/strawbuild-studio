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
  TAG_BASE_PLATE,
  TAG_LAYERS,
  TAG_MONOLITHIC_STUD_WALL,
  TAG_PLANKED_STUD_WALL,
  TAG_TOP_PLATE,
  TAG_WALL_LAYER_INTERIOR
} from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import { type Polygon2D, fromTrans, newVec3, subtractPolygons } from '@/shared/geometry'

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

function* constructPlate(
  area: WallConstructionArea,
  openingHoles: Polygon2D[],
  material: MaterialId,
  tags: (typeof TAG_BASE_PLATE)[],
  partType: 'head-plate' | 'sole-plate'
): Generator<ConstructionResult> {
  if (area.isEmpty) return
  const polygons = subtractPolygons([area.getSideProfilePolygon()], openingHoles)
  for (const polygon of polygons) {
    const shape = createExtrudedPolygon({ outer: polygon.outer, holes: polygon.holes }, 'xz', area.size[1])
    yield* yieldElement(
      createConstructionElement(material, shape, fromTrans(newVec3(0, area.position[1], 0)), tags, {
        type: partType,
        requiresSinglePiece: true
      })
    )
  }
}

function* constructFramedCore(
  wall: IntermediateWallWithGeometry,
  area: WallConstructionArea,
  openingHoles: Polygon2D[],
  extension: WallExtension,
  config: MonolithicStudWallAssemblyConfig | PlankedStudWallAssemblyConfig
): Generator<ConstructionResult> {
  let workingArea = area
  if (config.solePlateMaterial) {
    yield* constructPlate(
      workingArea.withZAdjustment(0, config.solePlateThickness),
      openingHoles,
      config.solePlateMaterial,
      [TAG_BASE_PLATE],
      'sole-plate'
    )
    workingArea = workingArea.withZAdjustment(config.solePlateThickness)
  }

  let studAreas = [workingArea]
  if (config.headPlateMaterial) {
    studAreas = []
    for (const continuousArea of workingArea.splitAtHeightJumps()) {
      const [headPlate, remaining] = continuousArea.splitAtTop(config.headPlateThickness)
      yield* constructPlate(headPlate, openingHoles, config.headPlateMaterial, [TAG_TOP_PLATE], 'head-plate')
      if (!remaining.isEmpty) studAreas.push(remaining)
    }
  }

  for (const [index, studArea] of studAreas.entries()) {
    const areaStartOffset = studArea.position[0] - area.position[0]
    const localExtensionStart = extension.startExtension - areaStartOffset
    const startsWithStand = index === 0
    const endsWithStand = index === studAreas.length - 1
    const segment = (segmentArea: WallConstructionArea, starts: boolean, ends: boolean) =>
      constructStudSegment(segmentArea, config, starts, ends)
    const infill = (infillArea: WallConstructionArea) => constructStudInfill(infillArea, config)
    yield* constructInteriorWallSegments(
      wall,
      studArea,
      localExtensionStart,
      0,
      startsWithStand,
      endsWithStand,
      segment,
      infill,
      config.openingAssemblyId
    )
  }
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
    yield* constructFramedCore(wall, area, _openingHoles, extension, this.config)
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
    yield* constructFramedCore(wall, studArea, openingHoles, extension, this.config)
  }
}
