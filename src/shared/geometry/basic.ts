import { mat2d, vec2, vec3 } from 'gl-matrix'

// Core types - simplified with gl-matrix
export type Vec2 = vec2
export type Vec3 = vec3
export type Matrix2D = mat2d

// Branded numeric types for type safety
export type Length = number & { __brand: 'Length' }
export type Area = number & { __brand: 'Area' }
export type Angle = number & { __brand: 'Angle' }

// Helper functions to create branded types
export const createLength = (value: number): Length => value as Length
export const createArea = (value: number): Area => value as Area
export const createAngle = (value: number): Angle => value as Angle

// Helper function to create Vec2
export const createVec2 = (x: number, y: number): Vec2 => vec2.fromValues(x, y)

// Bounds interface
export interface Bounds2D {
  min: Vec2
  max: Vec2
}

// Basic vector operations using gl-matrix
export function distance(p1: Vec2, p2: Vec2): Length {
  return createLength(vec2.distance(p1, p2))
}

export function distanceSquared(p1: Vec2, p2: Vec2): number {
  return vec2.squaredDistance(p1, p2)
}

export function midpoint(p1: Vec2, p2: Vec2): Vec2 {
  const result = vec2.create()
  vec2.lerp(result, p1, p2, 0.5)
  return result
}

export function angle(from: Vec2, to: Vec2): Angle {
  const direction = vec2.create()
  vec2.subtract(direction, to, from)
  return createAngle(Math.atan2(direction[1], direction[0]))
}

export function add(a: Vec2, b: Vec2): Vec2 {
  const result = vec2.create()
  vec2.add(result, a, b)
  return result
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  const result = vec2.create()
  vec2.subtract(result, a, b)
  return result
}

export function scale(v: Vec2, scalar: number): Vec2 {
  const result = vec2.create()
  vec2.scale(result, v, scalar)
  return result
}

export function normalize(v: Vec2): Vec2 {
  const result = vec2.create()
  vec2.normalize(result, v)
  return result
}

export function dot(a: Vec2, b: Vec2): number {
  return vec2.dot(a, b)
}

export function direction(source: Vec2, target: Vec2): Vec2 {
  return normalize(subtract(target, source))
}

export function perpendicular(vector: Vec2): Vec2 {
  return perpendicularCCW(vector) // Default to counter-clockwise
}

export function perpendicularCCW(vector: Vec2): Vec2 {
  return createVec2(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

export function boundsFromPoints(points: Vec2[]): Bounds2D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }

  return {
    min: createVec2(minX, minY),
    max: createVec2(maxX, maxY)
  }
}

export type Plane3D = 'xy' | 'xz' | 'yz'
export type Axis3D = 'x' | 'y' | 'z'

export const complementaryAxis = (plane: Plane3D): Axis3D => (plane === 'xy' ? 'z' : plane === 'xz' ? 'y' : 'x')

export interface Bounds3D {
  min: Vec3
  max: Vec3
}

export const vec3Add = (a: Vec3, b: Vec3): Vec3 => {
  const r = vec3.create()
  vec3.add(r, a, b)
  return r
}

export function boundsFromPoints3D(points: Vec3[]): Bounds3D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    minZ = Math.min(minZ, point[2])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
    maxZ = Math.max(maxZ, point[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}

export function mergeBounds(...bounds: Bounds3D[]): Bounds3D {
  if (bounds.length === 0) throw new Error('No bounds to merge')

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const bound of bounds) {
    minX = Math.min(minX, bound.min[0])
    minY = Math.min(minY, bound.min[1])
    minZ = Math.min(minZ, bound.min[2])
    maxX = Math.max(maxX, bound.max[0])
    maxY = Math.max(maxY, bound.max[1])
    maxZ = Math.max(maxZ, bound.max[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}
