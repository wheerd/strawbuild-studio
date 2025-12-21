import type { PolygonWithBoundingRect } from '@/construction/helpers'
import type { Material } from '@/construction/materials/material'
import { getMaterialById } from '@/construction/materials/store'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult } from '@/construction/results'
import { BaseRingBeamAssembly } from '@/construction/ringBeams/base'
import { TAG_PLATE, TAG_RB_INSULATION, TAG_STUD_WALL, TAG_WATERPROOFING } from '@/construction/tags'
import { type Transform, fromTrans, newVec3 } from '@/shared/geometry'

import type { BrickRingBeamConfig, RingBeamSegment } from './types'

export class BrickRingBeamAssembly extends BaseRingBeamAssembly<BrickRingBeamConfig> {
  get height() {
    return this.config.wallHeight + this.config.beamThickness + this.config.waterproofingThickness
  }

  *construct(
    segment: RingBeamSegment,
    context: PerimeterConstructionContext,
    _storeyContext?: import('@/construction/walls/segmentation').WallStoreyContext
  ): Generator<ConstructionResult> {
    yield* this.constructWallWithWaterproofing(segment, context)
    yield* this.constructInsulation(segment, context)
    yield* this.constructBeam(segment, context)
  }

  private *constructWallWithWaterproofing(segment: RingBeamSegment, context: PerimeterConstructionContext) {
    const wallMaterial = getMaterialById(this.config.wallMaterial)
    const waterproofingTransform = fromTrans(newVec3(0, 0, this.config.wallHeight))
    for (const polygon of this.polygons(segment, context, 0, this.config.wallWidth)) {
      yield* this.constructWall(wallMaterial, polygon)
      yield* this.constructTopWaterproofing(polygon, waterproofingTransform)
    }
    yield* this.constructOuterWaterproofing(segment, context)
  }

  private *constructWall(wallMaterial: Material | null, polygon: PolygonWithBoundingRect) {
    if (wallMaterial?.type === 'dimensional') {
      for (const brick of polygon.tiled(wallMaterial.lengths[0], this.config.wallWidth)) {
        yield* brick.extrude(wallMaterial.id, this.config.wallHeight, 'xy', undefined, [TAG_STUD_WALL], {
          type: 'brick'
        })
      }
    } else {
      yield* polygon.extrude(this.config.wallMaterial, this.config.wallHeight, 'xy', undefined, [TAG_STUD_WALL], {
        type: 'stud-wall'
      })
    }
  }

  private *constructTopWaterproofing(polygon: PolygonWithBoundingRect, waterproofingTransform: Transform) {
    yield* polygon.extrude(
      this.config.waterproofingMaterial,
      this.config.waterproofingThickness,
      'xy',
      waterproofingTransform,
      [TAG_WATERPROOFING],
      {
        type: 'waterproofing'
      }
    )
  }

  private *constructOuterWaterproofing(segment: RingBeamSegment, context: PerimeterConstructionContext) {
    for (const polygon of this.polygons(segment, context, this.config.wallWidth, this.config.waterproofingThickness)) {
      yield* polygon.extrude(
        this.config.waterproofingMaterial,
        this.config.wallHeight,
        'xy',
        undefined,
        [TAG_WATERPROOFING],
        {
          type: 'waterproofing'
        }
      )
    }
  }

  private *constructBeam(segment: RingBeamSegment, context: PerimeterConstructionContext) {
    const beamTransform = fromTrans(newVec3(0, 0, this.config.wallHeight + this.config.waterproofingThickness))
    for (const polygon of this.polygons(segment, context, 0, this.config.beamWidth)) {
      yield* polygon.extrude(this.config.beamMaterial, this.config.beamThickness, 'xy', beamTransform, [TAG_PLATE], {
        type: 'ring-beam'
      })
    }
  }

  private *constructInsulation(segment: RingBeamSegment, context: PerimeterConstructionContext) {
    const insulationOffset = this.config.wallWidth + this.config.waterproofingThickness
    for (const polygon of this.polygons(segment, context, insulationOffset, this.config.insulationThickness)) {
      yield* polygon.extrude(
        this.config.insulationMaterial,
        this.config.wallHeight,
        'xy',
        undefined,
        [TAG_RB_INSULATION],
        {
          type: 'insulation'
        }
      )
    }
  }
}
