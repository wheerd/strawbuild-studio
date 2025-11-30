import { type ReadonlyVec2, type ReadonlyVec3, mat4, vec2, vec3 } from 'gl-matrix'

import type { GroupOrElement } from '@/construction/elements'
import { Bounds2D, type Length } from '@/shared/geometry'
import { type Axis3D, Bounds3D, type Plane3D } from '@/shared/geometry'

export type Transform = mat4

export const IDENTITY: Transform = mat4.identity(mat4.create())

export const getPosition = (t: Transform) => mat4.getTranslation(vec3.create(), t)

export const translate = (v: vec3) => mat4.fromTranslation(mat4.create(), v)

export function transform(v: vec3, t: Transform): vec3 {
  return vec3.transformMat4(vec3.create(), v, t)
}

export function transformBounds(bounds: Bounds3D, t: Transform): Bounds3D {
  // Transform all 8 corner points of the bounding box
  const corners: vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]], // min corner
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]] // max corner
  ].map(corner => vec3.fromValues(corner[0], corner[1], corner[2]))

  // Transform all corners
  const transformedCorners = corners.map(corner => transform(corner, t))

  // Use boundsFromPoints3D to compute new bounds
  const result = Bounds3D.fromPoints(transformedCorners)
  if (!result) {
    throw new Error('Failed to compute transformed bounds')
  }
  return result
}

export type ZOrder = (
  a: { bounds: Bounds3D; transform?: Transform },
  b: { bounds: Bounds3D; transform?: Transform }
) => number

export const createZOrder = (axis: Axis3D, viewOrder: 'ascending' | 'descending'): ZOrder => {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2

  if (viewOrder === 'descending') {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For front view: sort by front face (max), farthest front face first
      return aBounds.max[axisIndex] - bBounds.max[axisIndex]
    }
  } else {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For back view: sort by back face (min), farthest back face first
      return bBounds.min[axisIndex] - aBounds.min[axisIndex]
    }
  }
}

export const bounds3Dto2D = (bounds: Bounds3D, projection: Projection): Bounds2D => {
  // Project all 8 corners and find 2D bounds
  const corners: vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]]
  ].map(corner => vec3.fromValues(corner[0], corner[1], corner[2]))

  // Project all corners to 2D
  const projectedCorners = corners.map(corner => {
    const projected = projection(corner)
    return vec2.fromValues(projected[0], projected[1])
  })

  // Find 2D bounds from projected points
  return Bounds2D.fromPoints(projectedCorners)
}

export type Projection = (p: vec3) => vec3
export type RotationProjection = (r: vec3) => number
export type CutFunction = (element: { bounds: Bounds3D; transform?: Transform }) => boolean

export const project = (plane: Plane3D): Projection => {
  switch (plane) {
    case 'xy':
      return (p: vec3): vec3 => vec3.fromValues(p[0], p[1], p[2])
    case 'xz':
      return (p: vec3): vec3 => vec3.fromValues(p[0], p[2], p[1])
    case 'yz':
      return (p: vec3): vec3 => vec3.fromValues(p[1], p[2], p[0])
    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

export const projectRotation = (plane: Plane3D): RotationProjection => {
  switch (plane) {
    case 'xy':
      return (r: vec3): number => (r[2] / Math.PI) * 180
    case 'xz':
      return (r: vec3): number => (r[1] / Math.PI) * 180
    case 'yz':
      return (r: vec3): number => (r[0] / Math.PI) * 180
    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

/**
 * Creates an SVG transform string from a Transform object using projection functions.
 * Common pattern used throughout construction plan rendering.
 *
 * @param transform - Transform object containing position and rotation
 * @param projection - Function to project 3D position to 2D/3D coordinates
 * @param rotationProjection - Function to project 3D rotation to 2D rotation angle
 * @returns SVG transform string in the format "translate(x y) rotate(angle)"
 */
export const createSvgTransform = (
  transform: Transform,
  projection?: Projection,
  rotationProjection?: RotationProjection
): string | undefined => {
  if (!projection || !rotationProjection) return undefined
  if (transform === IDENTITY) return undefined
  const position = projection(mat4.getTranslation(vec3.create(), transform))
  const euler = vec3.fromValues(
    Math.atan2(transform[6], transform[10]),
    Math.asin(-transform[2]),
    Math.atan2(transform[1], transform[0])
  )
  const rotation = rotationProjection(euler)
  return `translate(${position[0]} ${position[1]}) rotate(${rotation})`
}

export const IDENTITY_PROJECTION: Projection = v => v

export function* allPoints(element: GroupOrElement, projection: Projection): Generator<vec2> {
  if ('shape' in element) {
    yield projection(transform(element.shape.bounds.min, element.transform))
    yield projection(transform([element.shape.bounds.min[0], element.bounds.max[1]], element.transform))
    yield projection(transform(element.shape.bounds.max, element.transform))
    yield projection(transform([element.shape.bounds.max[0], element.bounds.min[1]], element.transform))
  } else if ('children' in element) {
    for (const child of element.children) {
      for (const p of allPoints(child, projection)) {
        yield transform(p, element.transform)
      }
    }
  }
}

export class WallConstructionArea {
  public readonly position: ReadonlyVec3
  public readonly size: ReadonlyVec3
  public readonly topOffsets?: ReadonlyArray<ReadonlyVec2>

  constructor(position: ReadonlyVec3, size: ReadonlyVec3, topOffsets?: ReadonlyArray<ReadonlyVec2>) {
    this.position = position
    this.size = size
    this.topOffsets = topOffsets
  }

  public getSubArea(start: Length, length: Length): WallConstructionArea {
    const end = start + length
    if (start < this.position[0] || end > this.position[0] + this.size[0]) {
      throw new Error('Out of bounds')
    }

    if (!this.topOffsets) {
      return new WallConstructionArea(
        vec3.fromValues(start, this.position[1], this.position[2]),
        vec3.fromValues(length, this.size[1], this.size[2])
      )
    }
    let startIndex = this.topOffsets.findIndex(o => o[0] > start)
    let endIndex = this.topOffsets.findIndex(o => o[0] > start + length)

    endIndex = Math.max(endIndex === -1 ? this.topOffsets.length - 1 : endIndex - 1, 1)
    startIndex = Math.max(startIndex === -1 ? endIndex - 1 : startIndex - 1, 0)

    const newTopOffsets = [
      vec2.fromValues(start, this.topOffsets[startIndex][1]),
      ...this.topOffsets.slice(startIndex + 1, endIndex),
      vec2.fromValues(end, this.topOffsets[endIndex][1])
    ]

    return new WallConstructionArea(
      vec3.fromValues(start, this.position[1], this.position[2]),
      vec3.fromValues(length, this.size[1], this.size[2]),
      newTopOffsets
    )
  }

  public getOffsetAt(position: Length): Length {
    if (!this.topOffsets) return 0
    let afterIndex = this.topOffsets.findIndex(o => o[0] > position)
    if (afterIndex < 1) return this.topOffsets[0][1]
    const before = this.topOffsets[afterIndex - 1]
    const after = this.topOffsets[afterIndex]
    const beforeRatio = (position - before[0]) / (after[0] - before[0])
    const afterRatio = 1 - beforeRatio
    return beforeRatio * before[1] + afterRatio * after[1]
  }

  public getMaxHeight(): Length {
    return this.size[2] + (this.topOffsets ? Math.max(...this.topOffsets.map(o => o[1])) : 0)
  }
}
