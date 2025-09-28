import { mat4, vec3 } from 'gl-matrix'

import type { Axis3D, Bounds2D, Bounds3D, Plane3D, Vec3 } from '@/shared/geometry'
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

export type ZOrder = (a: { bounds: Bounds3D }, b: { bounds: Bounds3D }) => number

export const createZOrder = (axis: Axis3D, order: 'min' | 'max'): ZOrder => {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const boundKey = order === 'min' ? 'min' : 'max'
  const sign = order === 'min' ? 1 : -1

  return (a, b) => {
    const aValue = a.bounds[boundKey][axisIndex]
    const bValue = b.bounds[boundKey][axisIndex]
    return sign * (aValue - bValue)
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
  const result = boundsFromPoints(projectedCorners)
  if (!result) {
    throw new Error('Failed to compute 2D bounds from projection')
  }
  return result
}

export type Projection = (p: Vec3) => Vec3
export type RotationProjection = (r: Vec3) => number

export const project = (plane: Plane3D, xDir: 1 | -1, yDir: 1 | -1, zDir: 1 | -1): Projection => {
  return (p: Vec3): Vec3 => {
    switch (plane) {
      case 'xy':
        return vec3.fromValues(p[0] * xDir, p[1] * yDir, p[2] * zDir)
      case 'xz':
        return vec3.fromValues(p[0] * xDir, p[2] * yDir, p[1] * zDir)
      case 'yz':
        return vec3.fromValues(p[1] * xDir, p[2] * yDir, p[0] * zDir)
      default:
        throw new Error(`Unknown plane: ${plane}`)
    }
  }
}

export const projectRotation = (plane: Plane3D, xDir: 1 | -1, yDir: 1 | -1): RotationProjection => {
  return (r: Vec3): number => {
    switch (plane) {
      case 'xy':
        return r[2] // TODO: Needs adjustment based on xDir/yDir
      case 'xz':
        return r[1] // TODO: Needs adjustment based on xDir/yDir
      case 'yz':
        return r[0] // TODO: Needs adjustment based on xDir/yDir
      default:
        throw new Error(`Unknown plane: ${plane}`)
    }
  }
}
