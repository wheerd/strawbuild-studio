import { mat4, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { PolygonWithHoles3D } from '@/shared/geometry/polygon'

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
