import type { Manifold } from 'manifold-3d'

import {
  type PolygonWithHoles3D,
  type Transform,
  type Vec3,
  ZERO_VEC3,
  addVec3,
  computeTriangleNormal,
  crossVec3,
  distVec3,
  dotVec3,
  lenVec3,
  newVec3,
  subVec3,
  transform
} from '@/shared/geometry'

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

/**
 * A 3D polygon with holes and its associated face normal.
 * The normal is in the same coordinate space as the polygon vertices.
 */
export interface PolygonWithNormal3D {
  polygon: PolygonWithHoles3D
  normal: Vec3 // Normalized face normal
}

// ---------------------------------------------------------------
// Vertex Deduplication Helpers
// ---------------------------------------------------------------

/**
 * Round coordinate to 0.1mm precision (base unit is millimeters)
 */
function roundCoord(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Create a unique string key for a vertex rounded to 0.1mm precision
 */
function vertexKey(v: Vec3): string {
  return `${roundCoord(v[0])},${roundCoord(v[1])},${roundCoord(v[2])}`
}

/**
 * Extract visible polygon faces from a manifold mesh in view space with backface culling.
 *
 * This function:
 * 1. Transforms all vertices to view space using the provided transform matrix
 * 2. Computes triangle normals in view space
 * 3. Performs backface culling (filters out triangles facing away from camera)
 * 4. Merges coplanar front-facing triangles into polygons
 *
 * @param m - The manifold mesh to extract faces from
 * @param t - Combined transform matrix (projectionMatrix * accumulatedTransform)
 *                    that transforms from local manifold space to view space
 * @param cullBackFaces - Whether to cull back-facing triangles (default: true)
 * @returns Array of polygons with normalized normals in view space (x, y, depth)
 */
export function getVisibleFacesInViewSpace(m: Manifold, t: Transform, cullBackFaces = true): PolygonWithNormal3D[] {
  const mesh = m.getMesh()

  // Extract vertex positions in local manifold space
  const localPositions: Vec3[] = []
  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    localPositions.push(newVec3(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  // Transform all vertices to view space upfront
  const viewSpacePositions = localPositions.map(p => transform(p, t))

  // Extract triangle indices
  const triangles: [number, number, number][] = []
  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    triangles.push([mesh.triVerts[i], mesh.triVerts[i + 1], mesh.triVerts[i + 2]])
  }

  // Compute triangle normals in view space
  const triangleNormals = triangles.map(t =>
    computeTriangleNormal(viewSpacePositions[t[0]], viewSpacePositions[t[1]], viewSpacePositions[t[2]])
  )

  // Backface culling: filter out triangles not facing the camera
  // In view space, camera always looks down -Z axis, so view direction is (0, 0, -1)
  const viewDirection = newVec3(0, 0, -1)
  const frontFacingIndices: number[] = []
  const EPSILON = 0.001 // Small tolerance for floating-point precision

  if (cullBackFaces) {
    for (let i = 0; i < triangles.length; i++) {
      const dotProduct = dotVec3(triangleNormals[i], viewDirection)
      // Exclude perpendicular and back-facing triangles (> 0, not >= 0)
      if (dotProduct > EPSILON) {
        frontFacingIndices.push(i)
      }
    }
    // If all faces are culled, return empty array
    if (frontFacingIndices.length === 0) {
      return []
    }
  }

  // Create filtered arrays with only front-facing triangles
  const filteredTriangles = cullBackFaces ? frontFacingIndices.map(i => triangles[i]) : triangles
  const filteredNormals = cullBackFaces ? frontFacingIndices.map(i => triangleNormals[i]) : triangleNormals

  // Step 1: Build edge → triangle adjacency (using filtered triangles)
  const edgeMap = new Map<string, number[]>()
  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  filteredTriangles.forEach((tri, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      const tris = edgeMap.get(key)
      if (tris) {
        tris.push(ti)
      } else {
        edgeMap.set(key, [ti])
      }
    }
  })

  // Step 2: Build adjacency graph of coplanar triangles (using filtered data)
  const adj: number[][] = filteredTriangles.map(() => [])
  for (const [, tris] of edgeMap) {
    if (tris.length === 2) {
      const [t1, t2] = tris
      if (
        areCoplanar(
          filteredNormals[t1],
          filteredNormals[t2],
          viewSpacePositions,
          filteredTriangles[t1],
          filteredTriangles[t2]
        )
      ) {
        adj[t1].push(t2)
        adj[t2].push(t1)
      }
    }
  }

  // Step 3: BFS to find connected components of coplanar triangles
  const visited = new Array<boolean>(filteredTriangles.length).fill(false)
  const components: number[][] = []
  const componentNormals: Vec3[] = [] // Track normalized normal for each component

  for (let i = 0; i < filteredTriangles.length; i++) {
    if (visited[i]) continue
    const comp: number[] = []
    const queue = [i]
    visited[i] = true

    while (queue.length > 0) {
      const t = queue.pop()
      if (t === undefined) break
      comp.push(t)
      for (const nb of adj[t]) {
        if (!visited[nb]) {
          visited[nb] = true
          queue.push(nb)
        }
      }
    }
    components.push(comp)

    // Store normalized normal (all triangles in component are coplanar, so use first)
    const normal = filteredNormals[i]
    const len = lenVec3(normal)
    componentNormals.push(len > 0 ? newVec3(normal[0] / len, normal[1] / len, normal[2] / len) : newVec3(0, 0, 1))
  }

  // Step 4: For each coplanar component, extract boundary loops and build polygon(s)
  // Polygons are in view space with their normalized normals
  return components.map((comp, i) => ({
    polygon: trianglesToPolygon(comp, filteredTriangles, viewSpacePositions),
    normal: componentNormals[i]
  }))
}

export interface Face3D {
  polygon: PolygonWithHoles3D
  normal: Vec3
}

export interface IndexedFace {
  outer: number[] // Vertex indices for outer boundary
  holes: number[][] // Vertex indices for holes
  normal: Vec3
}

export interface IndexedFacesResult {
  vertices: Vec3[] // Deduplicated vertex array
  faces: IndexedFace[]
}

export function getFacesFromManifold(m: Manifold): Face3D[] {
  const mesh = m.getMesh()

  const vertices: Vec3[] = []
  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    vertices.push(newVec3(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }
  // Extract triangle indices
  const triangles: [number, number, number][] = []
  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    triangles.push([mesh.triVerts[i], mesh.triVerts[i + 1], mesh.triVerts[i + 2]])
  }

  // Compute triangle normals in view space
  const triangleNormals = triangles.map(t => computeTriangleNormal(vertices[t[0]], vertices[t[1]], vertices[t[2]]))

  // Step 1: Build edge → triangle adjacency (using filtered triangles)
  const edgeMap = new Map<string, number[]>()
  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  triangles.forEach((tri, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      const tris = edgeMap.get(key)
      if (tris) {
        tris.push(ti)
      } else {
        edgeMap.set(key, [ti])
      }
    }
  })

  // Step 2: Build adjacency graph of coplanar triangles (using filtered data)
  const adj: number[][] = triangles.map(() => [])
  for (const [, tris] of edgeMap) {
    if (tris.length === 2) {
      const [t1, t2] = tris
      if (areCoplanar(triangleNormals[t1], triangleNormals[t2], vertices, triangles[t1], triangles[t2])) {
        adj[t1].push(t2)
        adj[t2].push(t1)
      }
    }
  }

  // Step 3: BFS to find connected components of coplanar triangles
  const visited = new Array<boolean>(triangles.length).fill(false)
  const components: number[][] = []
  const compNormals: Vec3[] = []

  for (let i = 0; i < triangles.length; i++) {
    if (visited[i]) continue
    const comp: number[] = []
    const queue = [i]
    visited[i] = true

    while (queue.length > 0) {
      const t = queue.pop()
      if (t === undefined) break
      comp.push(t)
      for (const nb of adj[t]) {
        if (!visited[nb]) {
          visited[nb] = true
          queue.push(nb)
        }
      }
    }
    components.push(comp)
    compNormals.push(triangleNormals[i])
  }

  // Step 4: For each coplanar component, extract boundary loops and build polygon(s)
  // Polygons are in view space
  return components.map((comp, i) => ({
    polygon: trianglesToPolygon(comp, triangles, vertices),
    normal: compNormals[i]
  }))
}

export function getFacesFromManifoldIndexed(m: Manifold): IndexedFacesResult {
  const mesh = m.getMesh()

  // Early exit for empty manifolds
  if (mesh.triVerts.length === 0) {
    return { vertices: [], faces: [] }
  }

  // Step 1: Build deduplicated vertex array
  const vertexMap = new Map<string, number>() // rounded coords -> unique index
  const uniqueVertices: Vec3[] = []
  const indexMap: number[] = [] // maps mesh vertex index -> unique index

  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    const v = newVec3(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2])
    const key = vertexKey(v)

    let uniqueIdx = vertexMap.get(key)
    if (uniqueIdx === undefined) {
      uniqueIdx = uniqueVertices.length
      uniqueVertices.push(v)
      vertexMap.set(key, uniqueIdx)
    }
    indexMap[i / 3] = uniqueIdx
  }

  // Step 2: Extract triangle indices and map to deduplicated vertices
  const rawTriangles: [number, number, number][] = []
  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    const t0 = mesh.triVerts[i]
    const t1 = mesh.triVerts[i + 1]
    const t2 = mesh.triVerts[i + 2]

    // Map to deduplicated indices immediately
    const d0 = indexMap[t0]
    const d1 = indexMap[t1]
    const d2 = indexMap[t2]

    rawTriangles.push([d0, d1, d2])
  }

  // Step 2a: Filter degenerate and duplicate triangles
  const triangles = filterTriangles(rawTriangles)

  // Early exit if no valid triangles remain
  if (triangles.length === 0) {
    return { vertices: uniqueVertices, faces: [] }
  }

  // Step 3: Compute triangle normals (triangles now use deduplicated indices directly)
  const triangleNormals = triangles.map(t =>
    computeTriangleNormal(uniqueVertices[t[0]], uniqueVertices[t[1]], uniqueVertices[t[2]])
  )

  // Step 4: Build edge → triangle adjacency (using deduplicated indices)
  const edgeMap = new Map<string, number[]>()
  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  triangles.forEach((tri, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      const tris = edgeMap.get(key)
      if (tris) {
        tris.push(ti)
      } else {
        edgeMap.set(key, [ti])
      }
    }
  })

  // Step 5: Build adjacency graph of coplanar triangles (triangles already use deduplicated indices)
  const adj: number[][] = triangles.map(() => [])
  for (const [, tris] of edgeMap) {
    if (tris.length === 2) {
      const [t1, t2] = tris
      if (areCoplanar(triangleNormals[t1], triangleNormals[t2], uniqueVertices, triangles[t1], triangles[t2])) {
        adj[t1].push(t2)
        adj[t2].push(t1)
      }
    }
  }

  // Step 6: BFS to find connected components of coplanar triangles
  const visited = new Array<boolean>(triangles.length).fill(false)
  const components: number[][] = []
  const compNormals: Vec3[] = []

  for (let i = 0; i < triangles.length; i++) {
    if (visited[i]) continue
    const comp: number[] = []
    const queue = [i]
    visited[i] = true

    while (queue.length > 0) {
      const t = queue.pop()
      if (t === undefined) break
      comp.push(t)
      for (const nb of adj[t]) {
        if (!visited[nb]) {
          visited[nb] = true
          queue.push(nb)
        }
      }
    }
    components.push(comp)
    compNormals.push(triangleNormals[i])
  }

  // Step 7: For each coplanar component, extract boundary loops and build indexed faces
  const faces: IndexedFace[] = []

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]
    const normal = compNormals[i]

    // Extract loops (triangles already use deduplicated indices)
    const loops = trianglesToIndexedLoops(comp, triangles)

    // Skip faces with empty loops (can happen after triangle filtering)
    if (loops.outer.length < 3) {
      continue
    }

    // Correct loop winding
    const correctedOuter = ensureConsistentLoopWinding(loops.outer, uniqueVertices, normal)
    const correctedHoles = loops.holes
      .filter(hole => hole.length >= 3) // Skip degenerate holes
      .map(hole => ensureConsistentLoopWinding(hole, uniqueVertices, normal))

    // Validate final face has valid outer loop
    if (correctedOuter.length >= 3) {
      faces.push({
        outer: correctedOuter,
        holes: correctedHoles,
        normal
      })
    }
  }

  return { vertices: uniqueVertices, faces }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function areCoplanar(
  n1: Vec3,
  n2: Vec3,
  positions: Vec3[],
  t1: [number, number, number],
  t2: [number, number, number]
): boolean {
  const normalEps = 1e-3 // ~0.06 degree tolerance for normals (using 1 - cos(angle))

  // Check normals using dot product (more numerically stable than squared distance)
  const dotProduct = dotVec3(n1, n2)
  if (dotProduct < 1 - normalEps) return false

  // Compute characteristic length scale from both triangles
  const scale1 = Math.max(
    distVec3(positions[t1[0]], positions[t1[1]]),
    distVec3(positions[t1[1]], positions[t1[2]]),
    distVec3(positions[t1[2]], positions[t1[0]])
  )
  const scale2 = Math.max(
    distVec3(positions[t2[0]], positions[t2[1]]),
    distVec3(positions[t2[1]], positions[t2[2]]),
    distVec3(positions[t2[2]], positions[t2[0]])
  )
  const scale = Math.max(scale1, scale2)
  const planeEps = scale * 1e-4 // Relative to geometry size

  // Check plane equation with average of all vertices for robustness
  // This is more stable for slim triangles with numerical errors
  const avgD1 = (dotVec3(n1, positions[t1[0]]) + dotVec3(n1, positions[t1[1]]) + dotVec3(n1, positions[t1[2]])) / 3
  const avgD2 = (dotVec3(n1, positions[t2[0]]) + dotVec3(n1, positions[t2[1]]) + dotVec3(n1, positions[t2[2]])) / 3

  return Math.abs(avgD1 - avgD2) < planeEps
}

// ---------------------------------------------------------------
// Convert a cluster of coplanar triangles into PolygonWithHoles3D
// ---------------------------------------------------------------

function trianglesToPolygon(
  comp: number[],
  triangles: [number, number, number][],
  positions: Vec3[]
): PolygonWithHoles3D {
  // Find boundary edges (those belonging to exactly one triangle in component)
  const countMap = new Map<string, number>()
  const edgeToVerts = new Map<string, [number, number]>()

  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const ti of comp) {
    const tri = triangles[ti]
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
      if (!edgeToVerts.has(key)) edgeToVerts.set(key, [a, b])
    }
  }

  const boundaryEdges = [...countMap.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => edgeToVerts.get(key))
    .filter((edge): edge is [number, number] => edge !== undefined)

  // Build adjacency so we can follow boundary loops
  const vertAdj = new Map<number, number[]>()
  for (const [a, b] of boundaryEdges) {
    const adjA = vertAdj.get(a)
    const adjB = vertAdj.get(b)
    if (adjA) {
      adjA.push(b)
    } else {
      vertAdj.set(a, [b])
    }
    if (adjB) {
      adjB.push(a)
    } else {
      vertAdj.set(b, [a])
    }
  }

  // Extract loops
  const loops: number[][] = []
  const usedEdges = new Set<string>()

  const edgeKey = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const [startA, startB] of boundaryEdges) {
    const key = edgeKey(startA, startB)
    if (usedEdges.has(key)) continue

    const loop = [startA, startB]
    usedEdges.add(key)

    let current = startB
    let prev = startA

    while (true) {
      const nexts = vertAdj.get(current)
      if (!nexts) break
      const next = nexts.find(v => v !== prev)
      if (next === undefined) break

      const k2 = edgeKey(current, next)
      if (usedEdges.has(k2)) break
      usedEdges.add(k2)

      if (next === startA) break // closed loop

      loop.push(next)

      prev = current
      current = next
    }

    loops.push(loop)
  }

  // Determine outer loop by area (largest area magnitude)
  const polys = loops.map(loop => loop.map(i => positions[i]))

  const areas = polys.map(p => polygonArea3D(p))
  const outerIndex = areas.findIndex(a => Math.max(...areas) === a)

  const outer = polys[outerIndex]
  const holes = polys.filter((_, i) => i !== outerIndex)

  return {
    outer: { points: outer },
    holes: holes.map(h => ({ points: h }))
  }
}

// ---------------------------------------------------------------
// Compute area of 3D polygon via projecting to plane
// ---------------------------------------------------------------

function polygonArea3D(points: Vec3[]): number {
  if (points.length < 3) return 0

  // Compute normal direction
  const p0 = points[0]
  let n = ZERO_VEC3
  for (let i = 1; i < points.length; i++) {
    const v1 = subVec3(points[i], p0)
    const v2 = subVec3(points[(i + 1) % points.length], p0)
    const cross = crossVec3(v1, v2)
    n = addVec3(n, cross)
  }

  return lenVec3(n) * 0.5
}

// ---------------------------------------------------------------
// Convert triangles to indexed loops (for B-Rep topology)
// ---------------------------------------------------------------

function trianglesToIndexedLoops(
  comp: number[],
  triangles: [number, number, number][]
): { outer: number[]; holes: number[][] } {
  // Triangles already use deduplicated vertex indices, just extract the ones in this component
  const deduplicatedTriangles = comp.map(ti => triangles[ti])

  // Find boundary edges (those belonging to exactly one triangle in component)
  // Work with deduplicated indices throughout
  const countMap = new Map<string, number>()
  const edgeToVerts = new Map<string, [number, number]>()

  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const tri of deduplicatedTriangles) {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
      if (!edgeToVerts.has(key)) edgeToVerts.set(key, [a, b])
    }
  }

  const boundaryEdges = [...countMap.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => edgeToVerts.get(key))
    .filter((edge): edge is [number, number] => edge !== undefined)

  // Build adjacency so we can follow boundary loops
  const vertAdj = new Map<number, number[]>()
  for (const [a, b] of boundaryEdges) {
    const adjA = vertAdj.get(a)
    const adjB = vertAdj.get(b)
    if (adjA) {
      adjA.push(b)
    } else {
      vertAdj.set(a, [b])
    }
    if (adjB) {
      adjB.push(a)
    } else {
      vertAdj.set(b, [a])
    }
  }

  // Extract loops (in mesh vertex indices)
  const loops: number[][] = []
  const usedEdges = new Set<string>()

  const edgeKey = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const [startA, startB] of boundaryEdges) {
    const key = edgeKey(startA, startB)
    if (usedEdges.has(key)) continue

    const loop = [startA, startB]
    usedEdges.add(key)

    let current = startB
    let prev = startA

    while (true) {
      const nexts = vertAdj.get(current)
      if (!nexts) break
      const next = nexts.find(v => v !== prev)
      if (next === undefined) break

      const k2 = edgeKey(current, next)
      if (usedEdges.has(k2)) break
      usedEdges.add(k2)

      if (next === startA) break // closed loop

      loop.push(next)

      prev = current
      current = next
    }

    loops.push(loop)
  }

  // Loops are already in deduplicated indices
  // Find outer loop (largest by area - we'll compute properly later)
  // For now, just use the first loop as outer
  if (loops.length === 0) {
    return { outer: [], holes: [] }
  }

  const outer = loops[0]
  const holes = loops.slice(1)

  return { outer, holes }
}

// ---------------------------------------------------------------
// Ensure consistent loop winding (CCW for outer, CW for holes)
// ---------------------------------------------------------------

function ensureConsistentLoopWinding(loop: number[], vertices: Vec3[], normal: Vec3): number[] {
  if (loop.length < 3) return loop

  // Compute signed area projected onto normal direction
  const loopPoints = loop.map(idx => vertices[idx])
  const signedArea = computeSignedArea(loopPoints, normal)

  // Outer loops should be CCW (positive area), holes should be CW (negative area)
  // For now, we assume the first loop is outer, so it should be positive
  // This function will be called with context (outer vs hole) from the caller
  // For simplicity, just ensure CCW (positive area)
  if (signedArea < 0) {
    return [...loop].reverse()
  }

  return loop
}

function computeSignedArea(points: Vec3[], normal: Vec3): number {
  if (points.length < 3) return 0

  // Use shoelace formula projected to the plane defined by normal
  // Area = 0.5 * normal · sum(p[i] × p[i+1])
  let areaVec = ZERO_VEC3

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const cross = crossVec3(p1, p2)
    areaVec = addVec3(areaVec, cross)
  }

  // Project onto normal
  const signedArea = dotVec3(areaVec, normal) * 0.5

  return signedArea
}

// ---------------------------------------------------------------
// Triangle Filtering (for boolean operation artifacts)
// ---------------------------------------------------------------

/**
 * Filter out degenerate and duplicate triangles that result from:
 * - Vertex deduplication collapsing thin artifacts
 * - Boolean operations creating overlapping geometry
 */
function filterTriangles(triangles: [number, number, number][]): [number, number, number][] {
  const seen = new Set<string>()
  const valid: [number, number, number][] = []

  for (const tri of triangles) {
    // 1. Check for degenerate triangle (any two vertices are the same)
    //    This happens when vertex deduplication merges vertices across a thin gap
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[2] === tri[0]) {
      continue // Skip degenerate
    }

    // 2. Create normalized signature (sorted indices for duplicate detection)
    //    Multiple triangles might map to the same deduplicated indices
    const sorted = [...tri].sort((a, b) => a - b)
    const signature = sorted.join(',')

    // 3. Skip if we've seen this exact triangle before
    if (seen.has(signature)) {
      continue // Skip duplicate
    }

    seen.add(signature)
    valid.push(tri)
  }

  return valid
}
