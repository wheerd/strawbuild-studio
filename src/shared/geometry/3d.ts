import { vec2, vec3 } from 'gl-matrix'

import type { Polygon2D, Polygon3D } from '@/shared/geometry/polygon'

export function computeTriangleNormal(a: vec3, b: vec3, c: vec3): vec3 {
  const ab = vec3.sub(vec3.create(), b, a)
  const ac = vec3.sub(vec3.create(), c, a)
  const n = vec3.cross(vec3.create(), ab, ac)
  vec3.normalize(n, n)
  return n
}

export function centroid(vertices: vec3[]): vec3 {
  const c = vec3.create()
  for (const v of vertices) vec3.add(c, c, v)
  vec3.scale(c, c, 1 / vertices.length)
  return c
}

export function buildPlaneBasis(n: vec3): [vec3, vec3] {
  // pick an arbitrary vector not parallel to n
  const tmp = Math.abs(n[0]) < 0.9 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0)

  // u = perpendicular to n
  const u = vec3.cross(vec3.create(), tmp, n)
  vec3.normalize(u, u)

  // v = perpendicular to n and u
  const v = vec3.cross(vec3.create(), n, u)
  vec3.normalize(v, v)

  return [u, v]
}

export const projectPolygonTo2D = (polygon: Polygon3D, u: vec3, v: vec3): Polygon2D => ({
  points: polygon.points.map(p => vec2.fromValues(vec3.dot(p, u), vec3.dot(p, v)))
})
