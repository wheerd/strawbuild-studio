import { type ReadonlyVec3, vec2, vec3 } from 'gl-matrix'

import type { Vec2 } from './2d'
import type { Length } from './basic'
import type { Polygon2D, Polygon3D } from './polygon'

export type Vec3 = ReadonlyVec3 & { readonly brand: unique symbol }

export const ZERO_VEC3 = vec3.fromValues(0, 0, 0) as Vec3

export const newVec3 = (x: number, y: number, z: number): Vec3 => vec3.fromValues(x, y, z) as Vec3
export const arrayToVec3 = (a: number[]): Vec3 => vec3.fromValues(a[0], a[1], a[2]) as Vec3
export const copyVec3 = (v: Vec3): Vec3 => vec3.clone(v) as Vec3
export const roundVec3 = (v: Vec3): Vec3 => vec3.round(vec3.create(), v) as Vec3
export const eqVec3 = (a: Vec3, b: Vec3): boolean => vec3.equals(a, b)
export const isZeroVec3 = (a: Vec3): boolean => vec3.equals(a, ZERO_VEC3)

export const normVec3 = (v: Vec3): Vec3 => vec3.normalize(vec3.create(), v) as Vec3
export const negVec3 = (v: Vec3): Vec3 => vec3.negate(vec3.create(), v) as Vec3
export const subVec3 = (a: Vec3, b: Vec3): Vec3 => vec3.sub(vec3.create(), a, b) as Vec3
export const addVec3 = (a: Vec3, b: Vec3): Vec3 => vec3.add(vec3.create(), a, b) as Vec3
export const scaleAddVec3 = (a: Vec3, b: Vec3, c: number): Vec3 => vec3.scaleAndAdd(vec3.create(), a, b, c) as Vec3
export const scaleVec3 = (a: Vec3, b: number): Vec3 => vec3.scale(vec3.create(), a, b) as Vec3
export const lerpVec3 = (a: Vec3, b: Vec3, c: number): Vec3 => vec3.lerp(vec3.create(), a, b, c) as Vec3

export const lenVec3 = (a: Vec3): Length => vec3.len(a)
export const lenSqrVec3 = (a: Vec3): Length => vec3.sqrLen(a)
export const distVec3 = (a: Vec3, b: Vec3): Length => vec3.dist(a, b)
export const distSqrVec3 = (a: Vec3, b: Vec3): number => vec3.sqrDist(a, b)
export const dotVec3 = (a: Vec3, b: Vec3): number => vec3.dot(a, b)
export const dotAbsVec3 = (a: Vec3, b: Vec3): number => Math.abs(vec3.dot(a, b))
export const crossVec3 = (a: Vec3, b: Vec3): Vec3 => vec3.cross(vec3.create(), a, b) as Vec3

export const projectVec3 = (base: Vec3, point: Vec3, dir: Vec3): number =>
  vec3.dot(vec3.sub(vec3.create(), point, base), dir)

export const midVec3 = (p1: Vec3, p2: Vec3): Vec3 => lerpVec3(p1, p2, 0.5)

export const dirVec3 = (source: Vec3, target: Vec3): Vec3 => normVec3(subVec3(target, source))

export function computeTriangleNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = vec3.sub(vec3.create(), b, a)
  const ac = vec3.sub(vec3.create(), c, a)
  const n = vec3.cross(vec3.create(), ab, ac)
  vec3.normalize(n, n)
  return n as Vec3
}

export function centroid(vertices: Vec3[]): Vec3 {
  const c = vec3.create()
  for (const v of vertices) vec3.add(c, c, v)
  vec3.scale(c, c, 1 / vertices.length)
  return c as Vec3
}

export function buildPlaneBasis(n: Vec3): [Vec3, Vec3] {
  // pick an arbitrary vector not parallel to n
  const tmp = Math.abs(n[0]) < 0.9 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0)

  // u = perpendicular to n
  const u = vec3.cross(vec3.create(), tmp, n)
  vec3.normalize(u, u)

  // v = perpendicular to n and u
  const v = vec3.cross(vec3.create(), n, u)
  vec3.normalize(v, v)

  return [u as Vec3, v as Vec3]
}

export const projectPolygonTo2D = (polygon: Polygon3D, u: Vec3, v: Vec3): Polygon2D => ({
  points: polygon.points.map(p => vec2.fromValues(vec3.dot(p, u), vec3.dot(p, v)) as Vec2)
})
