import { mat4, vec3 } from 'gl-matrix'

import { getConstructionElementClasses } from '@/construction/components/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, type RotationProjection, createSvgTransform } from '@/construction/geometry'
import { getPolygonFacesFromManifold } from '@/construction/manifold/faces'
import { Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

export type FaceTree = Face | FaceGroup

export interface Face {
  polygon: PolygonWithHoles2D
  zIndex: number
  className: string
  svgTransform?: string
}

export interface FaceGroup {
  zIndex: number
  className: string
  svgTransform?: string
  children: FaceTree[]
}

const EPSILON = 0.0001

export function* geometryFaces(
  groupOrElement: GroupOrElement,
  projection: Projection,
  rotationProjection: RotationProjection,
  zOffset = 0
): Generator<FaceTree> {
  const elementTransform = createSvgTransform(groupOrElement.transform, projection, rotationProjection)
  if ('shape' in groupOrElement) {
    const combinedClassName = getConstructionElementClasses(groupOrElement, undefined)
    const transformZ =
      (groupOrElement.transform ? projection(mat4.getTranslation(vec3.create(), groupOrElement.transform))[2] : 0) +
      zOffset
    const manifold = groupOrElement.shape.manifold
    const centerZ = projection(groupOrElement.bounds.center)[2]
    const faces3D = getPolygonFacesFromManifold(manifold)
    const faces2D = faces3D
      .map(f => {
        const zPosition = projection(f.outer.points[0])[2] + transformZ
        const zIndex = zPosition < centerZ ? zPosition + EPSILON : zPosition - EPSILON
        return {
          outer: { points: f.outer.points.map(o => projection(o)) },
          holes: f.holes.map(h => ({ points: h.points.map(p => projection(p)) })),
          zIndex
        }
      })
      .filter(f => !Bounds2D.fromPoints(f.outer.points).isEmpty)
    for (const { outer, holes, zIndex } of faces2D) {
      yield {
        polygon: {
          outer,
          holes
        },
        zIndex,
        className: combinedClassName,
        svgTransform: elementTransform
      }
    }
  } else if ('children' in groupOrElement) {
    const transformZ =
      (groupOrElement.transform ? projection(mat4.getTranslation(vec3.create(), groupOrElement.transform))[2] : 0) +
      zOffset
    const allChildFaces = groupOrElement.children.flatMap(c =>
      Array.from(geometryFaces(c, projection, rotationProjection, transformZ))
    )
    allChildFaces.sort((a, b) => a.zIndex - b.zIndex)
    const group = []
    let isFirst = true
    let lastZIndex = allChildFaces[0]?.zIndex ?? 0
    for (const face of allChildFaces) {
      if (lastZIndex !== face.zIndex && group.length > 0) {
        yield {
          zIndex: lastZIndex,
          className: getConstructionElementClasses(groupOrElement, undefined, isFirst ? 'minZ-in-group' : undefined),
          svgTransform: elementTransform,
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
        svgTransform: elementTransform,
        children: group
      }
    }
  }
}
