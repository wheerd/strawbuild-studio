import { type ReadonlyVec2, vec2, vec3 } from 'gl-matrix'

import type { Vec3 } from './3d'
import type { Length } from './basic'

export type Vec2 = ReadonlyVec2 & { readonly brand: unique symbol }

export const ZERO_VEC2 = vec2.fromValues(0, 0) as Vec2

export const newVec2 = (x: number, y: number): Vec2 => vec2.fromValues(x, y) as Vec2
export const copyVec2 = (v: Vec2): Vec2 => vec2.clone(v) as Vec2
export const roundVec2 = (v: Vec2): Vec2 => vec2.round(vec2.create(), v) as Vec2
export const eqVec2 = (a: Vec2, b: Vec2): boolean => vec2.equals(a, b)

export const normVec2 = (v: Vec2): Vec2 => vec2.normalize(vec2.create(), v) as Vec2
export const negVec2 = (v: Vec2): Vec2 => vec2.negate(vec2.create(), v) as Vec2
export const subVec2 = (a: Vec2, b: Vec2): Vec2 => vec2.sub(vec2.create(), a, b) as Vec2
export const addVec2 = (a: Vec2, b: Vec2): Vec2 => vec2.add(vec2.create(), a, b) as Vec2
export const scaleAddVec2 = (a: Vec2, b: Vec2, c: number): Vec2 => vec2.scaleAndAdd(vec2.create(), a, b, c) as Vec2
export const scaleVec2 = (a: Vec2, b: number): Vec2 => vec2.scale(vec2.create(), a, b) as Vec2
export const lerpVec2 = (a: Vec2, b: Vec2, c: number): Vec2 => vec2.lerp(vec2.create(), a, b, c) as Vec2
export const rotateVec2 = (a: Vec2, origin: Vec2, angle: number): Vec2 =>
  vec2.rotate(vec2.create(), a, origin, angle) as Vec2

export const lenVec2 = (a: Vec2): Length => vec2.len(a) as Length
export const lenSqrVec2 = (a: Vec2): Length => vec2.sqrLen(a) as Length
export const distVec2 = (a: Vec2, b: Vec2): Length => vec2.dist(a, b) as Length
export const distSqrVec2 = (a: Vec2, b: Vec2): number => vec2.sqrDist(a, b) as number
export const dotVec2 = (a: Vec2, b: Vec2): number => vec2.dot(a, b)
export const dotAbsVec2 = (a: Vec2, b: Vec2): number => Math.abs(vec2.dot(a, b))
export const angleVec2 = (a: Vec2, b: Vec2): number => vec2.angle(a, b)
export const signedAngleVec2 = (a: Vec2, b: Vec2): number => vec2.signedAngle(a, b)

export const vec2To3 = (a: Vec2): Vec3 => vec3.fromValues(a[0], a[1], 0) as Vec3
export const vec3To2 = (a: Vec3): Vec2 => vec2.copy(vec2.create(), a) as Vec2

export const projectVec2 = (base: Vec2, point: Vec2, dir: Vec2): number =>
  vec2.dot(vec2.sub(vec2.create(), point, base), dir)

export function centroidVec2(vertices: Vec2[]): Vec2 {
  const c = vec3.create()
  for (const v of vertices) vec2.add(c, c, v)
  vec2.scale(c, c, 1 / vertices.length)
  return c as Vec2
}

export const midpoint = (p1: Vec2, p2: Vec2): Vec2 => lerpVec2(p1, p2, 0.5) as Vec2

export const dirAngle = (from: Vec2, to: Vec2): number => {
  const direction = subVec2(to, from)
  return Math.atan2(direction[1], direction[0])
}
export const direction = (source: Vec2, target: Vec2): Vec2 => normVec2(subVec2(target, source)) as Vec2

export const perpendicular = (vector: Vec2): Vec2 => perpendicularCCW(vector) // Default to counter-clockwise
export const perpendicularCCW = (vector: Vec2): Vec2 => newVec2(-vector[1], vector[0]) // Rotate 90° counterclockwise
export const perpendicularCW = (vector: Vec2): Vec2 => newVec2(vector[1], -vector[0]) // Rotate 90° clockwise

const DOT_EPS = 0.001
export const isParallel = (a: Vec2, b: Vec2): boolean => 1 - dotAbsVec2(a, b) < DOT_EPS
