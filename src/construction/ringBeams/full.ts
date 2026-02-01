import { getModelActions } from '@/building/store'
import { PolygonWithBoundingRect } from '@/construction/helpers'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { type ConstructionResult } from '@/construction/results'
import type { StoreyContext } from '@/construction/storeys/context'
import { TAG_PLATE } from '@/construction/tags'

import { BaseRingBeamAssembly } from './base'
import type { FullRingBeamConfig, RingBeamSegment } from './types'

export class FullRingBeamAssembly extends BaseRingBeamAssembly<FullRingBeamConfig> {
  get height() {
    return this.config.height
  }

  *construct(
    segment: RingBeamSegment,
    context: PerimeterConstructionContext,
    storeyContext?: StoreyContext
  ): Generator<ConstructionResult> {
    const { getPerimeterWallById } = getModelActions()
    for (const part of this.colinearParts(segment)) {
      const prevWall = getPerimeterWallById(segment.perimeter.wallIds[part.prevWallIndex])
      const nextWall = getPerimeterWallById(segment.perimeter.wallIds[part.nextWallIndex])
      const polygon = this.createBeamPolygon(
        context,
        part.wall.direction,
        part.wall.outsideDirection,
        this.isWallIndexInSegment(part.prevWallIndex, segment),
        part.startCorner,
        prevWall.direction,
        this.isWallIndexInSegment(part.nextWallIndex, segment),
        part.endCorner,
        nextWall.direction,
        this.config.offsetFromEdge,
        this.config.width
      )

      // Backwards compatible: no storey context = flat extrusion
      if (!storeyContext) {
        yield* PolygonWithBoundingRect.fromPolygon({ outer: polygon, holes: [] }, part.wall.direction).extrude(
          this.config.material,
          this.config.height,
          'xy',
          undefined,
          [TAG_PLATE],
          {
            type: 'ring-beam'
          }
        )
        continue
      }

      const ceilingOffset = storeyContext.roofBottom - storeyContext.wallTop

      const { heightLine, boundingRect } = this.getHeightLineForBeamPolygon(
        polygon,
        part.wall.direction,
        segment.perimeter.storeyId
      )

      const subSegments = this.splitPolygonByHeightLine(boundingRect, heightLine)

      for (const sub of subSegments) {
        const adjustedStartHeight = sub.startHeight + ceilingOffset
        const adjustedEndHeight = sub.endHeight + ceilingOffset

        yield* this.extrudeWithSlope(
          sub.subPolygon,
          adjustedStartHeight,
          adjustedEndHeight,
          this.config.height,
          this.config.material,
          [TAG_PLATE],
          {
            type: 'ring-beam'
          }
        )
      }
    }
  }
}
