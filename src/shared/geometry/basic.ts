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
