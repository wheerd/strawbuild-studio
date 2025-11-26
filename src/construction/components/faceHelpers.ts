import { vec2 } from 'gl-matrix'

import { getConstructionElementClasses } from '@/construction/components/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, type RotationProjection, bounds3Dto2D, createSvgTransform } from '@/construction/geometry'
import { extrudedPolygonFaces } from '@/construction/shapes'
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
    const transformZ = (groupOrElement.transform ? projection(groupOrElement.transform?.position)[2] : 0) + zOffset

    if (groupOrElement.shape.type === 'cuboid') {
      const bounds = bounds3Dto2D(groupOrElement.shape.bounds, projection)
      const [x, y] = bounds.min
      const [length, width] = bounds.size
      const zIndexMin = projection(groupOrElement.shape.bounds.min)[2] + transformZ + EPSILON
      const zIndexMax = projection(groupOrElement.shape.bounds.max)[2] + transformZ - EPSILON

      for (const zIndex of [zIndexMin, zIndexMax]) {
        yield {
          polygon: {
            outer: {
              points: [
                vec2.fromValues(x, y),
                vec2.fromValues(x + length, y),
                vec2.fromValues(x + length, y + width),
                vec2.fromValues(x, y + width)
              ]
            },
            holes: []
          },
          zIndex,
          className: combinedClassName,
          svgTransform: elementTransform
        }
      }
    } else if (groupOrElement.shape.type === 'polygon') {
      const allFaces = Array.from(extrudedPolygonFaces(groupOrElement.shape))
      const centerZ = projection(groupOrElement.bounds.center)[2]
      const faces2D = allFaces
        .map(f => {
          const zPosition = projection(f.outer[0])[2] + transformZ
          const zIndex = zPosition < centerZ ? zPosition + EPSILON : zPosition - EPSILON
          return {
            outer: { points: f.outer.map(o => projection(o)) },
            holes: f.holes.map(h => ({ points: h.map(p => projection(p)) })),
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
    }
  } else if ('children' in groupOrElement) {
    const transformZ = (groupOrElement.transform ? projection(groupOrElement.transform?.position)[2] : 0) + zOffset
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
