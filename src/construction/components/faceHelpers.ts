import { mat4, vec2, vec3 } from 'gl-matrix'

import { getConstructionElementClasses } from '@/construction/components/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, projectPoint } from '@/construction/geometry'
import { getPolygonFacesFromManifold } from '@/construction/manifold/faces'
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
  parentTransform: mat4 = mat4.create(),
  zOffset = 0
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

    // Get untransformed faces from manifold
    const manifold = groupOrElement.shape.manifold
    const faces3D = getPolygonFacesFromManifold(manifold)

    // Transform vertices to 2D view space
    const faces2D = faces3D
      .map(f => {
        // Project outer boundary points
        const outerPoints = f.outer.points.map(p => {
          const projected = projectPoint(p, finalTransform)
          return vec2.fromValues(projected[0], projected[1])
        })

        // Project hole points
        const holes = f.holes.map(h => ({
          points: h.points.map(p => {
            const projected = projectPoint(p, finalTransform)
            return vec2.fromValues(projected[0], projected[1])
          })
        }))

        // Calculate z-index from first point's depth
        // Use centerZ logic: front faces get slight preference over back faces
        const faceDepth = projectPoint(f.outer.points[0], finalTransform)[2] + zOffset
        const zIndex = faceDepth < centerDepth ? faceDepth + EPSILON : faceDepth - EPSILON

        return {
          outer: { points: outerPoints },
          holes,
          zIndex
        }
      })
      .filter(f => !Bounds2D.fromPoints(f.outer.points).isEmpty)

    // Yield faces without SVG transform (all transforms baked into vertices)
    for (const { outer, holes, zIndex } of faces2D) {
      yield {
        polygon: { outer, holes },
        zIndex,
        className: combinedClassName
      }
    }
  } else if ('children' in groupOrElement) {
    // Calculate depth offset from accumulated transform
    const transformedOrigin = vec3.transformMat4(vec3.create(), vec3.create(), accumulatedTransform)
    const transformZ = projectPoint(transformedOrigin, projectionMatrix)[2] + zOffset

    // Process children with accumulated transform
    const allChildFaces = groupOrElement.children.flatMap(c =>
      Array.from(geometryFaces(c, projectionMatrix, accumulatedTransform, transformZ))
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
