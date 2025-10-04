import { mat4, vec3 } from 'gl-matrix'

import type { GroupOrElement } from '@/construction/elements'
import type { Axis3D, Bounds2D, Bounds3D, Plane3D, Vec2, Vec3 } from '@/shared/geometry'
import { boundsFromPoints, boundsFromPoints3D, createVec2 } from '@/shared/geometry'

export interface Transform {
  readonly position: Vec3
  readonly rotation: Vec3 // Euler angles
}

export const IDENTITY: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0]
}

export function transform(v: Vec3, t: Transform, origin?: Vec3): Vec3 {
  // Create transformation matrix
  const matrix = mat4.create()

  // Apply translation to origin if provided
  if (origin) {
    mat4.translate(matrix, matrix, origin)
  }

  // Apply position translation
  mat4.translate(matrix, matrix, t.position)

  // Apply rotations (Euler angles in radians: X, Y, Z order)
  mat4.rotateX(matrix, matrix, t.rotation[0])
  mat4.rotateY(matrix, matrix, t.rotation[1])
  mat4.rotateZ(matrix, matrix, t.rotation[2])

  // Apply inverse origin translation if provided
  if (origin) {
    const negOrigin = vec3.create()
    vec3.negate(negOrigin, origin)
    mat4.translate(matrix, matrix, negOrigin)
  }

  // Transform the vector
  const result = vec3.create()
  vec3.transformMat4(result, v, matrix)
  return result
}

export function transformBounds(bounds: Bounds3D, t: Transform): Bounds3D {
  // Transform all 8 corner points of the bounding box
  const corners: Vec3[] = [
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
  const result = boundsFromPoints3D(transformedCorners)
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
      // For front view: sort by front face (max), farthest front face first
      const aValue = a.bounds.max[axisIndex] + (a.transform?.position[axisIndex] ?? 0)
      const bValue = b.bounds.max[axisIndex] + (b.transform?.position[axisIndex] ?? 0)
      return aValue - bValue
    }
  } else {
    return (a, b) => {
      // For back view: sort by back face (min), farthest back face first
      const aValue = a.bounds.min[axisIndex] + (a.transform?.position[axisIndex] ?? 0)
      const bValue = b.bounds.min[axisIndex] + (b.transform?.position[axisIndex] ?? 0)
      return bValue - aValue
    }
  }
}

export const bounds3Dto2D = (bounds: Bounds3D, projection: Projection): Bounds2D => {
  // Project all 8 corners and find 2D bounds
  const corners: Vec3[] = [
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
    return createVec2(projected[0], projected[1])
  })

  // Find 2D bounds from projected points
  return boundsFromPoints(projectedCorners)
}

export type Projection = (p: Vec3) => Vec3
export type RotationProjection = (r: Vec3) => number
export type CutFunction = (element: { bounds: Bounds3D; transform?: Transform }) => boolean

export const project = (plane: Plane3D): Projection => {
  switch (plane) {
    case 'xy':
      return (p: Vec3): Vec3 => vec3.fromValues(p[0], p[1], p[2])
    case 'xz':
      return (p: Vec3): Vec3 => vec3.fromValues(p[0], p[2], p[1])
    case 'yz':
      return (p: Vec3): Vec3 => vec3.fromValues(p[1], p[2], p[0])
    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

export const projectRotation = (plane: Plane3D): RotationProjection => {
  switch (plane) {
    case 'xy':
      return (r: Vec3): number => (r[2] / Math.PI) * 180
    case 'xz':
      return (r: Vec3): number => (r[1] / Math.PI) * 180
    case 'yz':
      return (r: Vec3): number => (r[0] / Math.PI) * 180
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
  const position = projection(transform.position)
  const rotation = rotationProjection(transform.rotation)
  return `translate(${position[0]} ${position[1]}) rotate(${rotation})`
}

export const IDENTITY_PROJECTION: Projection = v => v

export function* allPoints(element: GroupOrElement, projection: Projection): Generator<Vec2> {
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
