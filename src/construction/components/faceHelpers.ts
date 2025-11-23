import { vec2 } from 'gl-matrix'

import { getConstructionElementClasses, getTagClasses } from '@/construction/components/cssHelpers'
import type { GroupOrElement } from '@/construction/elements'
import { type Projection, type RotationProjection, bounds3Dto2D, createSvgTransform } from '@/construction/geometry'
import { extrudedPolygonFaces } from '@/construction/shapes'
import type { Tag } from '@/construction/tags'
import { Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

export interface Face {
  polygon: PolygonWithHoles2D
  zIndex: number
  className: string
  svgTransform?: string
}

const EPSILON = 0.0001

export function* geometryFaces(
  groupOrElement: GroupOrElement,
  projection: Projection,
  rotationProjection: RotationProjection,
  tags: Tag[] = [],
  parentTransform?: string,
  zOffset: number = 0
): Generator<Face> {
  const elementTransform = createSvgTransform(groupOrElement.transform, projection, rotationProjection)
  const combinedTransform =
    parentTransform || elementTransform ? ((parentTransform ?? '') + ' ' + (elementTransform ?? '')).trim() : undefined
  if ('shape' in groupOrElement) {
    const groupTags = getTagClasses(tags)
    const combinedClassName = getConstructionElementClasses(groupOrElement, undefined, groupTags)
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
          svgTransform: combinedTransform
        }
      }
    } else if (groupOrElement.shape.type === 'polygon') {
      const allFaces = Array.from(extrudedPolygonFaces(groupOrElement.shape))
      const centerZ = projection(groupOrElement.bounds.center)[2]
      const faces2D = allFaces
        .map(f => {
          const zPosition = projection(f.outer[0])[2] + transformZ
          console.log('zPosition', zPosition, 'centerZ', centerZ)
          const zIndex = zPosition < centerZ ? zPosition + EPSILON : zPosition - EPSILON
          return {
            outer: { points: f.outer.map(o => projection(o)) },
            holes: f.holes.map(h => ({ points: h.map(p => projection(p)) })),
            zIndex
          }
        })
        .filter(f => {
          const bounds = Bounds2D.fromPoints(f.outer.points)
          return bounds.width !== 0 && bounds.height !== 0
        })
      for (const { outer, holes, zIndex } of faces2D) {
        yield {
          polygon: {
            outer,
            holes
          },
          zIndex,
          className: combinedClassName,
          svgTransform: combinedTransform
        }
      }
    }
  } else if ('children' in groupOrElement) {
    const transformZ = (groupOrElement.transform ? projection(groupOrElement.transform?.position)[2] : 0) + zOffset
    for (const child of groupOrElement.children) {
      yield* geometryFaces(
        child,
        projection,
        rotationProjection,
        tags.concat(groupOrElement.tags ?? []),
        combinedTransform,
        transformZ
      )
    }
  }
}
