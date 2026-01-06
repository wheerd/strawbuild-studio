import { createConstructionElement } from '@/construction/elements'
import type { WallConstructionArea } from '@/construction/geometry'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import { TAG_TRIANGLE_BATTON as TAG_TRIANGLE_BATTEN } from '@/construction/tags'
import { type Length, type PolygonWithHoles2D, addVec3, fromTrans, newVec2, newVec3 } from '@/shared/geometry'

import type { MaterialId } from './material'

export interface TriangularBattenConfig {
  size: Length // Default: 30mm
  material: MaterialId // Default: Battens
  inside: boolean
  outside: boolean
  minLength: Length // Default: 10cm
}

export function* constructTriangularBattens(
  area: WallConstructionArea,
  config: TriangularBattenConfig
): Generator<ConstructionResult> {
  const startHeight = area.getHeightAtStart()
  const startBattenHeight = startHeight - 2 * config.size
  const endHeight = area.getHeightAtEnd()
  const endBattenHeight = endHeight - 2 * config.size
  const horizontalBattenLength = area.size[0] - 2 * config.size
  const isBattenRelevant = (l: Length) => l >= config.minLength
  if (config.inside) {
    if (isBattenRelevant(startBattenHeight)) {
      const startPolygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, 0), newVec2(0, config.size), newVec2(config.size, 0)]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(startPolygon, 'xy', startBattenHeight),
          fromTrans(addVec3(area.position, newVec3(0, 0, config.size))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
    }
    if (isBattenRelevant(endBattenHeight)) {
      const endPolygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, 0), newVec2(0, config.size), newVec2(-config.size, 0)]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(endPolygon, 'xy', endBattenHeight),
          fromTrans(addVec3(area.position, newVec3(area.size[0], 0, config.size))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
    }
    if (isBattenRelevant(horizontalBattenLength)) {
      const bottomPolygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, 0), newVec2(0, config.size), newVec2(config.size, 0)]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(bottomPolygon, 'yz', horizontalBattenLength),
          fromTrans(addVec3(area.position, newVec3(config.size, 0, 0))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
      if (area.minHeight === area.size[2]) {
        const topPolygon: PolygonWithHoles2D = {
          outer: {
            points: [newVec2(0, 0), newVec2(0, -config.size), newVec2(config.size, 0)]
          },
          holes: []
        }
        yield* yieldElement(
          createConstructionElement(
            config.material,
            createExtrudedPolygon(topPolygon, 'yz', horizontalBattenLength),
            fromTrans(addVec3(area.position, newVec3(config.size, 0, startHeight))),
            [TAG_TRIANGLE_BATTEN],
            { type: 'triangular-batten' }
          )
        )
      }
    }
  }

  if (config.outside) {
    if (isBattenRelevant(startBattenHeight)) {
      const startPolygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, area.size[1]), newVec2(0, area.size[1] - config.size), newVec2(config.size, area.size[1])]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(startPolygon, 'xy', startBattenHeight),
          fromTrans(addVec3(area.position, newVec3(0, 0, config.size))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
    }
    if (isBattenRelevant(endBattenHeight)) {
      const endPolygon: PolygonWithHoles2D = {
        outer: {
          points: [
            newVec2(0, area.size[1]),
            newVec2(0, area.size[1] - config.size),
            newVec2(-config.size, area.size[1])
          ]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(endPolygon, 'xy', endBattenHeight),
          fromTrans(addVec3(area.position, newVec3(area.size[0], 0, config.size))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
    }

    if (isBattenRelevant(horizontalBattenLength)) {
      const bottomPolygon: PolygonWithHoles2D = {
        outer: {
          points: [newVec2(0, 0), newVec2(0, config.size), newVec2(-config.size, 0)]
        },
        holes: []
      }
      yield* yieldElement(
        createConstructionElement(
          config.material,
          createExtrudedPolygon(bottomPolygon, 'yz', horizontalBattenLength),
          fromTrans(addVec3(area.position, newVec3(config.size, area.size[1], 0))),
          [TAG_TRIANGLE_BATTEN],
          { type: 'triangular-batten' }
        )
      )
      if (area.minHeight === area.size[2]) {
        const topPolygon: PolygonWithHoles2D = {
          outer: {
            points: [newVec2(0, 0), newVec2(0, -config.size), newVec2(-config.size, 0)]
          },
          holes: []
        }
        yield* yieldElement(
          createConstructionElement(
            config.material,
            createExtrudedPolygon(topPolygon, 'yz', horizontalBattenLength),
            fromTrans(addVec3(area.position, newVec3(config.size, area.size[1], startHeight))),
            [TAG_TRIANGLE_BATTEN],
            { type: 'triangular-batten' }
          )
        )
      }
    }
  }
}
