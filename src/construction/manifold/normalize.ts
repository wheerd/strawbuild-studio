import { mat3, mat4, quat, vec3 } from 'gl-matrix'
import { type Manifold, type Mesh } from 'manifold-3d'

import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

//
// ───────────────────────────────────────────────────────────────
// 1. Extract vertex positions from manifold
// ───────────────────────────────────────────────────────────────
//

export function extractVertices(m: Manifold): vec3[] {
  const mesh = m.getMesh()
  const out: vec3[] = []

  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    out.push(vec3.fromValues(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  return out
}

//
// ───────────────────────────────────────────────────────────────
// 2. Compute centroid
// ───────────────────────────────────────────────────────────────
//

export function computeCentroid(points: vec3[]): vec3 {
  const c = vec3.create()
  for (const p of points) vec3.add(c, c, p)
  vec3.scale(c, c, 1 / points.length)
  return c
}

//
// ───────────────────────────────────────────────────────────────
// 3. Compute covariance matrix (3×3 symmetric)
// ───────────────────────────────────────────────────────────────
//

export function computeCovariance(points: vec3[]): mat3 {
  const centroid = computeCentroid(points)
  const C = mat3.create()

  for (const p of points) {
    const v = vec3.sub(vec3.create(), p, centroid)
    C[0] += v[0] * v[0] // xx
    C[1] += v[0] * v[1] // xy
    C[2] += v[0] * v[2] // xz
    C[4] += v[1] * v[1] // yy
    C[5] += v[1] * v[2] // yz
    C[8] += v[2] * v[2] // zz
  }

  const n1 = 1 / (points.length - 1)
  for (let i = 0; i < 9; i++) C[i] *= n1

  return C
}

//
// ───────────────────────────────────────────────────────────────
// 4. Compute eigenvalues/vectors of symmetric 3×3 matrix
//    (We implement a small, robust Jacobi eigen solver.
//     This avoids external dependencies.)
// ───────────────────────────────────────────────────────────────
//

export function eigenDecompositionSymmetric3(m: mat3): {
  eigenvalues: vec3
  eigenvectors: mat3 // columns = eigenvectors
} {
  // Convert to simple JS arrays for easier manipulation.
  const A = [
    [m[0], m[1], m[2]],
    [m[1], m[4], m[5]],
    [m[2], m[5], m[8]]
  ]

  // Start with identity matrix for eigenvectors
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ]

  const MAX_ITERS = 50
  const EPS = 1e-12

  function offDiagNorm(A: number[][]) {
    return Math.sqrt(A[0][1] ** 2 + A[0][2] ** 2 + A[1][2] ** 2)
  }

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    if (offDiagNorm(A) < EPS) break

    // Find largest off-diagonal element
    let p = 0
    let q = 1
    if (Math.abs(A[0][2]) > Math.abs(A[0][1])) q = 2
    if (Math.abs(A[1][2]) > Math.abs(A[0][q])) {
      p = 1
      q = 2
    }

    // Compute Jacobi rotation
    const app = A[p][p]
    const aqq = A[q][q]
    const apq = A[p][q]
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app)
    const c = Math.cos(phi)
    const s = Math.sin(phi)

    // Rotate A
    for (let i = 0; i < 3; i++) {
      const aip = A[i][p]
      const aiq = A[i][q]
      A[i][p] = c * aip - s * aiq
      A[i][q] = s * aip + c * aiq
    }
    for (let i = 0; i < 3; i++) {
      const api = A[p][i]
      const aqi = A[q][i]
      A[p][i] = c * api - s * aqi
      A[q][i] = s * api + c * aqi
    }

    // Rotate V
    for (let i = 0; i < 3; i++) {
      const vip = V[i][p]
      const viq = V[i][q]
      V[i][p] = c * vip - s * viq
      V[i][q] = s * vip + c * viq
    }
  }

  const eigenvalues = vec3.fromValues(A[0][0], A[1][1], A[2][2])
  const eigenvectors = mat3.fromValues(V[0][0], V[0][1], V[0][2], V[1][0], V[1][1], V[1][2], V[2][0], V[2][1], V[2][2])

  return { eigenvalues, eigenvectors }
}

//
// ───────────────────────────────────────────────────────────────
// 5. Build canonical rotation from PCA results
//    (sort, fix sign ambiguity, ensure det = +1)
// ───────────────────────────────────────────────────────────────
//

export function canonicalRotationFromPCA(vals: vec3, vecs: mat3): mat3 {
  // Convert eigenpairs into array for sorting
  const eigenPairs = [
    { value: vals[0], vec: vec3.fromValues(vecs[0], vecs[1], vecs[2]) },
    { value: vals[1], vec: vec3.fromValues(vecs[3], vecs[4], vecs[5]) },
    { value: vals[2], vec: vec3.fromValues(vecs[6], vecs[7], vecs[8]) }
  ]

  // Sort eigenvectors by eigenvalue descending
  eigenPairs.sort((a, b) => b.value - a.value)

  // Construct rotation matrix where columns = eigenvectors
  const R = mat3.fromValues(
    eigenPairs[0].vec[0],
    eigenPairs[1].vec[0],
    eigenPairs[2].vec[0],
    eigenPairs[0].vec[1],
    eigenPairs[1].vec[1],
    eigenPairs[2].vec[1],
    eigenPairs[0].vec[2],
    eigenPairs[1].vec[2],
    eigenPairs[2].vec[2]
  )

  // Fix handedness: we require det(R) = +1
  const det =
    R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6])

  if (det < 0) {
    // Flip the third column
    R[2] *= -1
    R[5] *= -1
    R[8] *= -1
  }

  return R
}

//
// ───────────────────────────────────────────────────────────────
// 6. Apply canonical transform to all vertices
// ───────────────────────────────────────────────────────────────
//

export function applyCanonicalTransform(points: vec3[], centroid: vec3, rotation: mat3): vec3[] {
  const M = mat4.fromRotationTranslation(mat4.create(), mat3ToQuat(rotation), vec3.negate(vec3.create(), centroid))

  return points.map(p => {
    const v4 = vec3.transformMat4(vec3.create(), p, M)
    return v4
  })
}

// Helper: convert mat3 → quaternion
function mat3ToQuat(m: mat3): quat {
  const q = quat.create()
  quat.fromMat3(q, m)
  return q
}

//
// ───────────────────────────────────────────────────────────────
// 7. Canonical sorting of vertices for hashing
// ───────────────────────────────────────────────────────────────
//

export function canonicalSort(points: vec3[]): Float64Array {
  const arr = points.map(p => [p[0], p[1], p[2]])
  arr.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  return new Float64Array(arr.flat())
}

//
// ───────────────────────────────────────────────────────────────
// 8. Hash the canonical geometry
// ───────────────────────────────────────────────────────────────
//

export async function hashFloat64Array(data: Float64Array): Promise<string> {
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

//
// ───────────────────────────────────────────────────────────────
// 9. High-level function: normalize manifold geometry
// ───────────────────────────────────────────────────────────────
//

export async function normalizeManifoldGeometry(m: Manifold): Promise<{
  canonicalPoints: Float64Array
  hash: string
}> {
  let pts = extractVertices(m)
  const centroid = computeCentroid(pts)
  const cov = computeCovariance(pts)
  const { eigenvalues, eigenvectors } = eigenDecompositionSymmetric3(cov)
  const R = canonicalRotationFromPCA(eigenvalues, eigenvectors)

  pts = applyCanonicalTransform(pts, centroid, R)

  const sorted = canonicalSort(pts)
  const hash = await hashFloat64Array(sorted)

  return { canonicalPoints: sorted, hash }
}

//
// ───────────────────────────────────────────────────────────────
// 10. Compare two manifolds for geometric equality
// ───────────────────────────────────────────────────────────────
//

export async function sameGeometry(a: Manifold, b: Manifold): Promise<boolean> {
  const na = await normalizeManifoldGeometry(a)
  const nb = await normalizeManifoldGeometry(b)
  return na.hash === nb.hash
}

/* ----------------------------------------------------------
 *  Convert mat3 → mat4 (rotation only)
 * ---------------------------------------------------------- */

function mat4FromRotationTranslation3(rotation: mat3, translation: vec3): mat4 {
  const m = mat4.create()
  mat4.fromRotationTranslation(m, quat.fromMat3(quat.create(), rotation), translation)
  return m
}

/* ----------------------------------------------------------
 *  Apply 4×4 transform to all vertex positions of a mesh
 * ---------------------------------------------------------- */

function transformMeshVertices(mesh: ReturnType<Manifold['getMesh']>, transform: mat4): Float32Array {
  const out: number[] = []

  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    const x = mesh.vertProperties[i]
    const y = mesh.vertProperties[i + 1]
    const z = mesh.vertProperties[i + 2]

    const p = vec3.fromValues(x, y, z)
    const t = vec3.transformMat4(vec3.create(), p, transform)

    out.push(t[0], t[1], t[2])
  }

  return new Float32Array(out)
}

/* ----------------------------------------------------------
 *  Rebuild a manifold from transformed vertices
 *  (faces remain identical)
 * ---------------------------------------------------------- */

function rebuildManifoldFromMesh(mesh: Mesh, newVertices: Float32Array): Manifold {
  const module = getManifoldModule()
  const outMesh: Mesh = new module.Mesh({
    ...mesh,
    vertProperties: newVertices
  })
  return getManifoldModule().Manifold.ofMesh(outMesh)
}

/* ----------------------------------------------------------
 *  MAIN API: Produce canonical manifold + transforms
 * ---------------------------------------------------------- */

export async function normalizeManifoldForReuse(m: Manifold): Promise<{
  canonicalManifold: Manifold
  hash: string
  toCanonical: mat4
  fromCanonical: mat4
}> {
  const pts = extractVertices(m)
  const centroid = computeCentroid(pts)
  const cov = computeCovariance(pts)

  const { eigenvalues, eigenvectors } = eigenDecompositionSymmetric3(cov)
  const R = canonicalRotationFromPCA(eigenvalues, eigenvectors)

  /* ------------------------------------------------------
   * Construct transforms
   *
   * p_c = R * (p - centroid)
   * p   = Rᵀ * p_c + centroid
   * ------------------------------------------------------ */

  const negCentroid = vec3.negate(vec3.create(), centroid)

  const toCanonical = mat4FromRotationTranslation3(R, vec3.transformMat3(vec3.create(), negCentroid, R))

  const Rt = mat3.transpose(mat3.create(), R)

  const fromCanonical = mat4FromRotationTranslation3(Rt, centroid)

  /* ------------------------------------------------------
   * Create canonical manifold by transforming mesh vertices
   * ------------------------------------------------------ */

  const mesh = m.getMesh()
  const canonicalVertices = transformMeshVertices(mesh, toCanonical)
  const canonicalManifold = rebuildManifoldFromMesh(mesh, canonicalVertices)

  /* ------------------------------------------------------
   * Hash normalized vertex cloud (sorted)
   * ------------------------------------------------------ */

  const sorted = canonicalSort(
    canonicalVertices.reduce<vec3[]>((acc, _, i) => {
      if (i % 3 === 0)
        acc.push(vec3.fromValues(canonicalVertices[i], canonicalVertices[i + 1], canonicalVertices[i + 2]))
      return acc
    }, [])
  )

  const hash = await hashFloat64Array(sorted)

  return {
    canonicalManifold,
    hash,
    toCanonical,
    fromCanonical
  }
}

/* ----------------------------------------------------------
 *  Reconstruct original manifold from canonical
 * ---------------------------------------------------------- */

export function reconstructFromCanonical(canonical: Manifold, fromCanonical: mat4): Manifold {
  const mesh = canonical.getMesh()
  const v = transformMeshVertices(mesh, fromCanonical)
  return rebuildManifoldFromMesh(mesh, v)
}
