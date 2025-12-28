import { getConstructionElementClasses } from '@/construction/components/plan/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import type { Projection } from '@/construction/geometry'
import { getVisibleFacesInViewSpace } from '@/construction/manifold/faces'
import {
  Bounds2D,
  IDENTITY,
  type PolygonWithHoles2D,
  type Transform,
  composeTransform,
  dotVec3,
  newVec2,
  newVec3
} from '@/shared/geometry'

export type FaceTree = Face | FaceGroup

export interface Face {
  polygon: PolygonWithHoles2D
  zIndex: number
  className: string
}

export interface FaceGroup {
  zIndex: number
  className: string
  children: FaceTree[]
}

const EPSILON = 0.0001

/**
 * Generate face trees from construction elements, accumulating transforms and projecting to 2D.
 *
 * @param groupOrElement - The element or group to process
 * @param projectionMatrix - The view projection matrix
 * @param parentTransform - Accumulated parent transform (identity for top-level elements)
 * @param zOffset - Additional z-offset for depth ordering
 */
export function* geometryFaces(
  groupOrElement: GroupOrElement,
  projectionMatrix: Projection,
  parentTransform: Transform = IDENTITY
): Generator<FaceTree> {
  // Accumulate transform: parent * element
  const accumulatedTransform = composeTransform(parentTransform, groupOrElement.transform)

  if ('shape' in groupOrElement) {
    const combinedClassName = getConstructionElementClasses(groupOrElement, undefined)

    // Combine projection with accumulated transform
    const finalTransform = composeTransform(projectionMatrix, accumulatedTransform)

    // Get visible faces in view space with backface culling applied
    // The finalTransform (projection * accumulated) transforms from local manifold space to view space
    const manifold = groupOrElement.shape.manifold
    const faces3D = getVisibleFacesInViewSpace(manifold, finalTransform, false)

    // Faces are already in view space (transformed), so we extract 2D coordinates directly
    const faces2D = faces3D
      .map(f => {
        const outerPoints = f.polygon.outer.points.map(p => newVec2(p[0], p[1]))
        const holes = f.polygon.holes.map(h => ({
          points: h.points.map(p => newVec2(p[0], p[1]))
        }))

        // Determine front vs back face using normal (in view space, camera looks down -Z axis)
        const viewDirection = newVec3(0, 0, -1)
        const isFrontFace = dotVec3(f.normal, viewDirection) > 0

        // Use closest point to camera for z-ordering of tilted faces (e.g., roof purlins/rafters)
        const closestPointDepth = Math.max(...f.polygon.outer.points.map(p => p[2]))

        // Apply EPSILON nudging: front faces render above back faces at same depth
        const zIndex = isFrontFace ? closestPointDepth + EPSILON : closestPointDepth - EPSILON

        return {
          outer: { points: outerPoints },
          holes,
          zIndex
        }
      })
      .filter(f => !Bounds2D.fromPoints(f.outer.points).isEmpty)

    for (const { outer, holes, zIndex } of faces2D) {
      yield {
        polygon: { outer, holes },
        zIndex,
        className: combinedClassName
      }
    }
  } else if ('children' in groupOrElement) {
    const allChildFaces = groupOrElement.children.flatMap(c =>
      Array.from(geometryFaces(c, projectionMatrix, accumulatedTransform))
    )

    // Sort by z-index and group
    allChildFaces.sort((a, b) => a.zIndex - b.zIndex)
    const group = []
    let isFirst = true
    let lastZIndex = allChildFaces[0]?.zIndex ?? 0

    for (const face of allChildFaces) {
      if (lastZIndex !== face.zIndex && group.length > 0) {
        yield {
          zIndex: lastZIndex,
          className: getConstructionElementClasses(groupOrElement, undefined, isFirst ? 'minZ-in-group' : undefined),
          children: group.splice(0, group.length)
        }
        lastZIndex = face.zIndex
        isFirst = false
      }
      group.push(face)
    }

    if (group.length > 0) {
      yield {
        zIndex: lastZIndex,
        className: getConstructionElementClasses(groupOrElement, undefined, 'maxZ-in-group'),
        children: group
      }
    }
  }
}
