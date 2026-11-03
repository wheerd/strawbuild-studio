import type { IntermediateWallWithGeometry } from '@/building/model'
import { type Length, type Transform, dirAngle, fromTrans, newVec3, rotateZ } from '@/shared/geometry'

export function intermediateWallTransform(wall: IntermediateWallWithGeometry, wallBottom: Length): Transform {
  return rotateZ(
    fromTrans(newVec3(wall.entityReferenceLine.start[0], wall.entityReferenceLine.start[1], wallBottom)),
    dirAngle(wall.entityReferenceLine.start, wall.entityReferenceLine.end)
  )
}
