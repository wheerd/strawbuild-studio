import { mat3, vec2, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import { getFacesFromManifold } from '@/construction/manifold/faces'
import {
  Bounds2D,
  type Length,
  type Polygon2D,
  type Polygon3D,
  type PolygonWithHoles2D,
  canonicalPolygonKey,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  minimumAreaBoundingBox,
  simplifyPolygon
} from '@/shared/geometry'
import { computeTriangleNormal } from '@/shared/geometry/3d'

const TOL = 1e-2
const INV_TOL = 1 / TOL

// integer quantization
function q(x: number): number {
  return Math.round(x * INV_TOL)
}

function approx(a: number, b: number, eps = TOL): boolean {
  return Math.abs(a - b) <= eps
}

function covariance(vertices: vec3[]): mat3 {
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]

  for (const v of vertices) {
    m[0][0] += v[0] * v[0]
    m[0][1] += v[0] * v[1]
    m[0][2] += v[0] * v[2]
    m[1][1] += v[1] * v[1]
    m[1][2] += v[1] * v[2]
    m[2][2] += v[2] * v[2]
  }

  // symmetric
  m[1][0] = m[0][1]
  m[2][0] = m[0][2]
  m[2][1] = m[1][2]

  return mat3.fromValues(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2])
}

export interface SideFace {
  index: number // The index of the side this is for with respect to boxSize
  polygon: PolygonWithHoles2D // Normalized to fit within [0,0] to [side width,side height]
}

export interface PartInfo {
  id: string
  boxSize: vec3
  sideFaces?: SideFace[]
}

export function getPartInfoFromManifold(manifold: Manifold): PartInfo {
  const cuboid = isCuboid(manifold)
  if (cuboid != null) {
    return {
      id: `cuboid:${cuboid.dims.map(q).join(',')}`,
      boxSize: vec3.fromValues(cuboid.dims[0], cuboid.dims[1], cuboid.dims[2])
    }
  }
  const extruded = isExtruded(manifold)
  if (extruded != null) {
    const polygonKeys = [
      canonicalPolygonKey(extruded.polygon.outer.points),
      ...extruded.polygon.holes.map(h => canonicalPolygonKey(h.points))
    ]
    const roundedDims = extruded.dims.map(Math.round)
    return {
      id: `extruded:${roundedDims.join(',')}|outer:${polygonKeys.join('|hole:')}`,
      boxSize: vec3.fromValues(roundedDims[0], roundedDims[1], roundedDims[2]),
      sideFaces: [{ index: extruded.dims.indexOf(extruded.thickness), polygon: extruded.polygon }]
    }
  }
  return {
    id: 'no',
    boxSize: vec3.create()
  }
}

function isCuboid(manifold: Manifold): { dims: number[] } | null {
  const mesh = manifold.getMesh()
  const normals: vec3[] = []

  const vertices: vec3[] = []
  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    vertices.push(vec3.fromValues(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    const n = computeTriangleNormal(
      vertices[mesh.triVerts[i]],
      vertices[mesh.triVerts[i + 1]],
      vertices[mesh.triVerts[i + 2]]
    )

    let found = false
    for (const m of normals) {
      if (Math.abs(vec3.dot(n, m)) > 0.999) {
        found = true
        break
      }
    }
    if (!found) normals.push(n)
  }

  if (normals.length !== 3) return null

  // orthogonality
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      if (Math.abs(vec3.dot(normals[i], normals[j])) > 1e-3) return null
    }
  }

  const dims: number[] = []
  for (const n of normals) {
    let min = Infinity,
      max = -Infinity
    for (const v of vertices) {
      const d = vec3.dot(v, n)
      min = Math.min(min, d)
      max = Math.max(max, d)
    }
    dims.push(max - min)
  }

  dims.sort((a, b) => a - b) // d1 <= d2 <= d3
  const vol = dims[0] * dims[1] * dims[2]
  const manifoldVolume = manifold.volume()
  if (Math.abs(vol - manifoldVolume) > manifoldVolume * 1e-6) return null
  return { dims }
}

function isExtruded(manifold: Manifold): { dims: number[]; polygon: PolygonWithHoles2D; thickness: Length } | null {
  const faces = getFacesFromManifold(manifold)

  const capPairs = []
  for (let i = 0; i < faces.length; i++) {
    for (let j = i + 1; j < faces.length; j++) {
      const areOpposite = vec3.dot(faces[i].normal, faces[j].normal) < -0.999
      if (areOpposite) {
        capPairs.push([i, j])
      }
    }
  }

  capLoop: for (const [c1, c2] of capPairs) {
    const p1 = faces[c1].polygon
    const p2 = faces[c2].polygon
    const n = faces[c1].normal
    const outerEdgeCount = polygonEdgeCount(p1.outer)
    if (outerEdgeCount !== polygonEdgeCount(p2.outer)) continue
    if (p1.holes.length !== p2.holes.length) continue

    let totalSideFaceCount = outerEdgeCount
    for (let i = 0; i < p1.holes.length; i++) {
      const holeEdgeCount = polygonEdgeCount(p1.holes[i])
      if (holeEdgeCount !== polygonEdgeCount(p2.holes[i])) {
        continue capLoop
      }
      totalSideFaceCount += holeEdgeCount
    }

    if (totalSideFaceCount != faces.length - 2) continue

    for (let i = 0; i < faces.length; i++) {
      if (i === c1 || i === c2) continue
      const faceIsNotPerpendicular = Math.abs(vec3.dot(faces[i].normal, n)) > 0.001
      if (faceIsNotPerpendicular) {
        continue capLoop
      }
    }

    const d1 = vec3.dot(p1.outer.points[0], n)
    const d2 = vec3.dot(p2.outer.points[0], n)
    const thickness = Math.abs(d1 - d2)
    const [u, v] = buildPlaneBasis(n)
    const polygon2D: PolygonWithHoles2D = {
      outer: ensurePolygonIsClockwise(projectPolygonTo2D(p1.outer, u, v)),
      holes: p1.holes.map(h => ensurePolygonIsCounterClockwise(projectPolygonTo2D(h, u, v)))
    }
    const simplifiedPolygon = simplifyPolygonWithHoles(polygon2D)
    const { size, polygon } = normalizedPolygon(simplifiedPolygon)

    return {
      dims: [thickness, size[0], size[1]].sort((a, b) => a - b),
      polygon,
      thickness
    }
  }
  return null
}

function polygonEdgeCount(polygon: Polygon3D) {
  return vec3.equals(polygon.points[0], polygon.points[polygon.points.length - 1])
    ? polygon.points.length - 1
    : polygon.points.length
}

function simplifyPolygonWithHoles(polygon: PolygonWithHoles2D) {
  return {
    outer: simplifyPolygon(polygon.outer, 0.1),
    holes: polygon.holes.map(h => simplifyPolygon(h, 0.1))
  }
}

function buildPlaneBasis(n: vec3): [vec3, vec3] {
  // pick an arbitrary vector not parallel to n
  let tmp = Math.abs(n[0]) < 0.9 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0)

  // u = perpendicular to n
  const u = vec3.cross(vec3.create(), tmp, n)
  vec3.normalize(u, u)

  // v = perpendicular to n and u
  const v = vec3.cross(vec3.create(), n, u)
  vec3.normalize(v, v)

  return [u, v]
}

function projectPolygonTo2D(polygon: Polygon2D, u: vec3, v: vec3): Polygon2D {
  const points: vec2[] = []

  for (const p of polygon.points) {
    const x = vec3.dot(p, u)
    const y = vec3.dot(p, v)
    points.push(vec2.fromValues(x, y))
  }

  return { points }
}

function normalizedPolygon(polygon: PolygonWithHoles2D) {
  const simplifiedPolygon: PolygonWithHoles2D = {
    outer: simplifyPolygon(polygon.outer, 0.1),
    holes: polygon.holes.map(h => simplifyPolygon(h, 0.1))
  }
  const { size, angle } = minimumAreaBoundingBox(simplifiedPolygon.outer)
  const sinAngle = Math.sin(-angle)
  const cosAngle = Math.cos(-angle)

  const rotatePoint = (point: vec2) => {
    const x = point[0] * cosAngle - point[1] * sinAngle
    const y = point[0] * sinAngle + point[1] * cosAngle
    return vec2.fromValues(x, y)
  }

  const rotatedPolygon: PolygonWithHoles2D = {
    outer: { points: simplifiedPolygon.outer.points.map(rotatePoint) },
    holes: polygon.holes.map(h => ({ points: h.points.map(rotatePoint) }))
  }
  const bounds = Bounds2D.fromPoints(rotatedPolygon.outer.points)

  const normalizePolygon = (polygon: Polygon2D) => {
    return {
      points: polygon.points.map(p =>
        vec2.fromValues(Math.round(p[0] - bounds.min[0]), Math.round(p[1] - bounds.min[1]))
      )
    }
  }
  const normalizedPolygon: PolygonWithHoles2D = {
    outer: normalizePolygon(rotatedPolygon.outer),
    holes: polygon.holes.map(h => normalizePolygon(h))
  }
  return { polygon: normalizedPolygon, size }
}
