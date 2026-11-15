import type { IntermediateWallWithGeometry, OpeningWithGeometry } from '@/building/model'
import type { StudWallAssemblyConfig } from '@/config/types'
import { BaseInteriorWallAssembly } from '@/construction/assemblies/interiorWalls/base'
import { constructInteriorWallSegments } from '@/construction/assemblies/interiorWalls/segmentation'
import type { WallConstructionArea } from '@/construction/assemblies/utils/WallConstructionArea'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import type { GroupOrElement } from '@/construction/model/elements'
import {
  type ConstructionResult,
  yieldAndCollectElements,
  yieldElement,
  yieldError
} from '@/construction/model/results'
import {
  TAG_BASE_PLATE,
  TAG_INFILL,
  TAG_NOGGIN_SPACING,
  TAG_STUD_SPACING,
  TAG_STUD_WALL,
  TAG_TOP_PLATE,
  TAG_WALL_NOGGIN,
  TAG_WALL_PLANKING,
  TAG_WALL_STUD
} from '@/construction/model/tags'
import { type Length, type Polygon2D } from '@/shared/geometry'

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

    yield* constructInteriorWallSegments(
      wall,
      this.area,
      true,
      true,
      this.constructStudWallSegment.bind(this),
      this.config.openingAssemblyId
    )
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

  protected *constructStudWallSegment(
    area: WallConstructionArea,
    startsWithStud: boolean,
    endsWithStud: boolean
  ): Generator<ConstructionResult> {
    const { studWidth, maxStudSpacing } = this.config

    if (startsWithStud) {
      let firstStud
      ;[firstStud, area] = area.splitInX(studWidth)

      const studElements: GroupOrElement[] = []
      yield* yieldAndCollectElements(this.constructStud(firstStud), studElements)
      if (firstStud.size[0] < studWidth && !firstStud.isEmpty) {
        yield yieldError($ => $.construction.infill.notEnoughSpaceForPost, undefined, studElements)
      }
    }

    if (endsWithStud) {
      let lastStud
      ;[area, lastStud] = area.splitInX(area.size[0] - studWidth)

      const studElements: GroupOrElement[] = []
      yield* yieldAndCollectElements(this.constructStud(lastStud), studElements)
      if (lastStud.size[0] < studWidth && !lastStud.isEmpty) {
        yield yieldError($ => $.construction.infill.notEnoughSpaceForPost, undefined, studElements)
      }
    }

    if (area.size[0] <= maxStudSpacing) {
      yield* this.constructStudInfill(area, false)
      return
    }

    if (this.config.equidistantStuds) {
      const span = area.size[0] - this.config.desiredStudSpacing
      const studCount = this.calculateIntervalCount(span)
      const totalInfillWidth = area.size[0] - studCount * this.config.studWidth
      const infillWidth = Math.floor(totalInfillWidth / (studCount + 1))
      for (let i = 0; i < studCount; i++) {
        let stud, infill
        ;[infill, area] = area.splitInX(infillWidth)
        yield* this.constructStudInfill(infill, i % 2 === 1)
        ;[stud, area] = area.splitInX(this.config.studWidth)
        yield* this.constructStud(stud)
      }
      yield* this.constructStudInfill(area, studCount % 2 === 1)
    } else {
      const fullInfillAndStud = this.config.desiredStudSpacing + this.config.studWidth
      let stagger = false
      while (area.size[0] > this.config.maxStudSpacing) {
        let infillWidth = this.config.desiredStudSpacing

        // Not enough space for full infill + stud + minimal infill, but more than a single full bale + post
        // -> Shorten the first infill so that a stud and a minimal infill fit after
        if (area.size[0] < fullInfillAndStud + this.config.minStudSpacing && area.size[0] > fullInfillAndStud) {
          infillWidth = Math.max(area.size[0] - this.config.minStudSpacing - this.config.studWidth, 0)
        }

        // More space than a full infill, but not enough for full infill and post
        // -> Shorten bale to fit a post
        if (area.size[0] < fullInfillAndStud) {
          infillWidth = Math.max(area.size[0] - this.config.studWidth, 0)
        }

        let stud, infill
        ;[infill, area] = area.splitInX(infillWidth)
        yield* this.constructStudInfill(infill, stagger)
        ;[stud, area] = area.splitInX(studWidth)
        yield* this.constructStud(stud)

        stagger = !stagger
      }

      yield* this.constructStudInfill(area, stagger)
    }
  }

  protected *constructStudInfill(area: WallConstructionArea, stagger: boolean): Generator<ConstructionResult> {
    if (area.isEmpty) return
    yield* area.yieldMeasurement('width', [TAG_STUD_SPACING])

    if (!this.config.nogginMaterial) {
      if (this.config.fillMaterial) {
        yield* yieldElement(area.extrude(this.config.fillMaterial, [TAG_INFILL]))
      }
      return
    }

    let infillHeight = this.config.nogginSpacing
    if (this.config.equidistantNoggins) {
      const nogginCount = Math.ceil(
        (area.size[2] - this.config.nogginSpacing) / (this.config.nogginSpacing + this.config.nogginThickness)
      )
      const totalInfillHeight = area.size[2] - nogginCount * this.config.nogginThickness
      infillHeight = Math.round(totalInfillHeight / (nogginCount + 1))
    }

    while (area.size[2] > infillHeight) {
      let noggin, infill
      const staggerOffset = stagger && this.config.staggerNoggins ? this.config.nogginThickness : 0
      ;[infill, area] = area.splitInZ(infillHeight - staggerOffset)

      if (this.config.fillMaterial) {
        yield* yieldElement(infill.extrude(this.config.fillMaterial, [TAG_INFILL]))
      }
      yield* infill.yieldMeasurement('height', [TAG_NOGGIN_SPACING])
      ;[noggin, area] = area.splitInZ(this.config.nogginThickness)
      yield* yieldElement(
        noggin.extrude(this.config.nogginMaterial, [TAG_WALL_NOGGIN], { type: 'noggin', requiresSinglePiece: true })
      )
      stagger = false
    }

    if (this.config.fillMaterial) {
      yield* yieldElement(area.extrude(this.config.fillMaterial, [TAG_INFILL]))
    }
    yield* area.yieldMeasurement('height', [TAG_NOGGIN_SPACING])
  }

  protected constructStud(stud: WallConstructionArea): Generator<ConstructionResult> {
    return yieldElement(
      stud.extrude(this.config.studMaterial, [TAG_WALL_STUD], {
        type: 'stud',
        requiresSinglePiece: true
      })
    )
  }

  protected calculateIntervalCount(span: Length) {
    const { maxStudSpacing, minStudSpacing, desiredStudSpacing } = this.config
    const minStudCount = Math.max(1, Math.ceil(span / maxStudSpacing))
    const maxStudCount = Math.max(minStudCount, Math.floor(span / minStudSpacing))
    const desiredStudCount = Math.round(span / desiredStudSpacing)
    return Math.min(maxStudCount, Math.max(minStudCount, desiredStudCount))
  }
}
