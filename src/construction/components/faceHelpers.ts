import { mat4, vec3 } from 'gl-matrix'

import { getConstructionElementClasses } from '@/construction/components/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, projectPoint } from '@/construction/geometry'
import { getVisibleFacesInViewSpace } from '@/construction/manifold/faces'
import { newVec2 } from '@/shared/geometry'
import { Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

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
  parentTransform: mat4 = mat4.create()
): Generator<FaceTree> {
  // Accumulate transform: parent * element
  const accumulatedTransform = mat4.multiply(mat4.create(), parentTransform, groupOrElement.transform)

  if ('shape' in groupOrElement) {
    const combinedClassName = getConstructionElementClasses(groupOrElement, undefined)

    // Combine projection with accumulated transform
    const finalTransform = mat4.multiply(mat4.create(), projectionMatrix, accumulatedTransform)

    // Get element center in world space for z-ordering
    const worldCenter = vec3.transformMat4(vec3.create(), groupOrElement.bounds.center, accumulatedTransform)
    const centerDepth = projectPoint(worldCenter, projectionMatrix)[2]

    // Get visible faces in view space with backface culling applied
    // The finalTransform (projection * accumulated) transforms from local manifold space to view space
    const manifold = groupOrElement.shape.manifold
    const faces3D = getVisibleFacesInViewSpace(manifold, finalTransform, false)

    // Faces are already in view space (transformed), so we extract 2D coordinates directly
    const faces2D = faces3D
      .map(f => {
        const outerPoints = f.outer.points.map(p => newVec2(p[0], p[1]))
        const holes = f.holes.map(h => ({
          points: h.points.map(p => newVec2(p[0], p[1]))
        }))

        // Use centerZ logic: front faces get slight preference over back faces
        const faceDepth = f.outer.points[0][2]
        const zIndex = faceDepth < centerDepth ? faceDepth + EPSILON : faceDepth - EPSILON

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
