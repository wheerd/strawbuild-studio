import type { Manifold } from 'manifold-3d'

import { type Face3D, getFacesFromManifold } from '@/construction/manifold/faces'
import type { SideFace } from '@/construction/parts/types'
import {
  Bounds2D,
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  type PolygonWithHoles3D,
  type Vec2,
  type Vec3,
  canonicalPolygonKey,
  dotAbsVec3,
  dotVec3,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  eqVec2,
  minimumAreaBoundingBox,
  newVec2,
  newVec3,
  polygonEdgeCount,
  simplifyPolygon,
  simplifyPolygonWithHoles
} from '@/shared/geometry'
import { buildPlaneBasis, computeTriangleNormal, projectPolygonTo2D } from '@/shared/geometry/3d'
import { createId } from '@/shared/utils/ids'

export interface ManifoldPartInfo {
  id: string
  boxSize: Vec3
  sideFaces?: SideFace[]
}

export function getPartInfoFromManifold(manifold: Manifold): ManifoldPartInfo {
  const cuboid = isCuboid(manifold)
  if (cuboid != null) {
    const roundedDims = cuboid.dims.map(Math.round)
    return {
      id: `cuboid:${roundedDims.join('x')}`,
      boxSize: newVec3(roundedDims[0], roundedDims[1], roundedDims[2])
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
      id: `extruded:${roundedDims.join('x')}|outer:${polygonKeys.join('|hole:')}`,
      boxSize: newVec3(roundedDims[0], roundedDims[1], roundedDims[2]),
      sideFaces: [{ index: extruded.dims.indexOf(extruded.thickness), polygon: extruded.polygon }]
    }
  }
  const bounds = manifold.boundingBox()
  const roundedDims = [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]]
    .map(Math.round)
    .sort((a, b) => a - b)
  // TODO: Still try to extract faces
  return {
    id: createId('unknown-'),
    boxSize: newVec3(roundedDims[0], roundedDims[1], roundedDims[2])
  }
}

function isCuboid(manifold: Manifold): { dims: number[] } | null {
  const mesh = manifold.getMesh()
  const normals: Vec3[] = []

  const vertices: Vec3[] = []
  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    vertices.push(newVec3(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    const n = computeTriangleNormal(
      vertices[mesh.triVerts[i]],
      vertices[mesh.triVerts[i + 1]],
      vertices[mesh.triVerts[i + 2]]
    )

    let found = false
    for (const m of normals) {
      if (dotAbsVec3(n, m) > 0.999) {
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
      if (dotAbsVec3(normals[i], normals[j]) > 1e-3) return null
    }
  }

  const dims: number[] = []
  for (const n of normals) {
    let min = Infinity
    let max = -Infinity
    for (const v of vertices) {
      const d = dotVec3(v, n)
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
      const areOpposite = dotVec3(faces[i].normal, faces[j].normal) < -0.999
      if (areOpposite) {
        capPairs.push([i, j])
      }
    }
  }

  for (const [c1, c2] of capPairs) {
    const p1 = faces[c1].polygon
    const p2 = faces[c2].polygon
    const n = faces[c1].normal

    if (!checkFaceCounts(p1, p2, faces)) continue
    if (!checkFacesPerpendiular(c1, c2, faces)) continue

    const d1 = dotVec3(p1.outer.points[0], n)
    const d2 = dotVec3(p2.outer.points[0], n)
    const thickness = Math.abs(d1 - d2)
    const [u, v] = buildPlaneBasis(n)
    const polygon2D: PolygonWithHoles2D = {
      outer: ensurePolygonIsClockwise(projectPolygonTo2D(p1.outer, u, v)),
      holes: p1.holes.map(h => ensurePolygonIsCounterClockwise(projectPolygonTo2D(h, u, v)))
    }
    const simplifiedPolygon = simplifyPolygonWithHoles(polygon2D)
    if (!simplifiedPolygon) continue

    const { size, polygon } = normalizedPolygon(simplifiedPolygon)

    return {
      dims: [thickness, size[0], size[1]].sort((a, b) => a - b),
      polygon,
      thickness
    }
  }
  return null
}

function checkFaceCounts(p1: PolygonWithHoles3D, p2: PolygonWithHoles3D, faces: Face3D[]) {
  const outerEdgeCount = polygonEdgeCount(p1.outer)
  if (outerEdgeCount !== polygonEdgeCount(p2.outer)) return false
  if (p1.holes.length !== p2.holes.length) return false

  let totalSideFaceCount = outerEdgeCount
  for (let i = 0; i < p1.holes.length; i++) {
    const holeEdgeCount = polygonEdgeCount(p1.holes[i])
    if (holeEdgeCount !== polygonEdgeCount(p2.holes[i])) {
      return false
    }
    totalSideFaceCount += holeEdgeCount
  }

  return totalSideFaceCount === faces.length - 2
}

function checkFacesPerpendiular(c1: number, c2: number, faces: Face3D[]) {
  for (let i = 0; i < faces.length; i++) {
    if (i === c1 || i === c2) continue
    const faceIsNotPerpendicular = dotAbsVec3(faces[i].normal, faces[c1].normal) > 0.001
    if (faceIsNotPerpendicular) {
      return false
    }
  }

  return true
}

function normalizedPolygon(polygon: PolygonWithHoles2D) {
  const simplifiedPolygon: PolygonWithHoles2D = {
    outer: simplifyPolygon(polygon.outer, 0.1),
    holes: polygon.holes.map(h => simplifyPolygon(h, 0.1))
  }
  const { size, angle } = minimumAreaBoundingBox(simplifiedPolygon.outer)
  const sinAngle = Math.sin(-angle)
  const cosAngle = Math.cos(-angle)

  const flipXY = size[0] > size[1]
  const rotatePoint = (point: Vec2) => {
    const x = point[0] * cosAngle - point[1] * sinAngle
    const y = point[0] * sinAngle + point[1] * cosAngle
    return newVec2(flipXY ? y : x, flipXY ? x : y)
  }

  const rotatedPolygon: PolygonWithHoles2D = {
    outer: { points: simplifiedPolygon.outer.points.map(rotatePoint) },
    holes: simplifiedPolygon.holes.map(h => ({ points: h.points.map(rotatePoint) }))
  }
  const bounds = Bounds2D.fromPoints(rotatedPolygon.outer.points)

  const normalizePolygon = (polygon: Polygon2D) => {
    const roundedPoints = polygon.points.map(p =>
      newVec2(Math.round(p[0] - bounds.min[0]), Math.round(p[1] - bounds.min[1]))
    )
    const n = roundedPoints.length
    const filtered = roundedPoints.filter((v, i) => !eqVec2(v, roundedPoints[(i + 1) % n]))
    return {
      points: filtered
    }
  }
  const normalizedPolygon: PolygonWithHoles2D = {
    outer: normalizePolygon(rotatedPolygon.outer),
    holes: rotatedPolygon.holes.map(h => normalizePolygon(h))
  }
  return { polygon: normalizedPolygon, size }
}
