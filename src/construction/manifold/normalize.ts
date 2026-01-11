import { mat3 } from 'gl-matrix'
import { type Manifold, type Mesh } from 'manifold-3d'

import {
  type Transform,
  type Transform3,
  type Vec3,
  centroid,
  fromRotTrans,
  negVec3,
  newVec3,
  subVec3,
  transform,
  transform3,
  transpose3
} from '@/shared/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

//
// ───────────────────────────────────────────────────────────────
// 1. Extract vertex positions from manifold
// ───────────────────────────────────────────────────────────────
//

export function extractVertices(m: Manifold): Vec3[] {
  const mesh = m.getMesh()
  const out: Vec3[] = []

  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    out.push(newVec3(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  return out
}

//
// ───────────────────────────────────────────────────────────────
// 3. Compute covariance matrix (3×3 symmetric)
// ───────────────────────────────────────────────────────────────
//

export function computeCovariance(points: Vec3[]): mat3 {
  const c = centroid(points)
  const C = mat3.create()

  for (const p of points) {
    const v = subVec3(p, c)
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
  eigenvalues: Vec3
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

  const eigenvalues = newVec3(A[0][0], A[1][1], A[2][2])
  const eigenvectors = mat3.fromValues(V[0][0], V[0][1], V[0][2], V[1][0], V[1][1], V[1][2], V[2][0], V[2][1], V[2][2])

  return { eigenvalues, eigenvectors }
}

//
// ───────────────────────────────────────────────────────────────
// 5. Build canonical rotation from PCA results
//    (sort, fix sign ambiguity, ensure det = +1)
// ───────────────────────────────────────────────────────────────
//

export function canonicalRotationFromPCA(vals: Vec3, vecs: mat3): Transform3 {
  // Convert eigenpairs into array for sorting
  const eigenPairs = [
    { value: vals[0], vec: newVec3(vecs[0], vecs[1], vecs[2]) },
    { value: vals[1], vec: newVec3(vecs[3], vecs[4], vecs[5]) },
    { value: vals[2], vec: newVec3(vecs[6], vecs[7], vecs[8]) }
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

  return R as Transform3
}

//
// ───────────────────────────────────────────────────────────────
// 6. Apply canonical transform to all vertices
// ───────────────────────────────────────────────────────────────
//

export function applyCanonicalTransform(points: Vec3[], centroid: Vec3, rotation: Transform3): Vec3[] {
  const M = fromRotTrans(rotation, negVec3(centroid))

  return points.map(p => {
    const v4 = transform(p, M)
    return v4
  })
}

//
// ───────────────────────────────────────────────────────────────
// 7. Canonical sorting of vertices for hashing
// ───────────────────────────────────────────────────────────────
//

export function canonicalSort(points: Vec3[]): Float64Array {
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
  const c = centroid(pts)
  const cov = computeCovariance(pts)
  const { eigenvalues, eigenvectors } = eigenDecompositionSymmetric3(cov)
  const R = canonicalRotationFromPCA(eigenvalues, eigenvectors)

  pts = applyCanonicalTransform(pts, c, R)

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
 *  Apply 4×4 transform to all vertex positions of a mesh
 * ---------------------------------------------------------- */

function transformMeshVertices(mesh: ReturnType<Manifold['getMesh']>, t: Transform): Float32Array {
  const out: number[] = []

  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    const x = mesh.vertProperties[i]
    const y = mesh.vertProperties[i + 1]
    const z = mesh.vertProperties[i + 2]

    out.push(...transform(newVec3(x, y, z), t))
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
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
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
  toCanonical: Transform
  fromCanonical: Transform
}> {
  const pts = extractVertices(m)
  const c = centroid(pts)
  const cov = computeCovariance(pts)

  const { eigenvalues, eigenvectors } = eigenDecompositionSymmetric3(cov)
  const R = canonicalRotationFromPCA(eigenvalues, eigenvectors)

  /* ------------------------------------------------------
   * Construct transforms
   *
   * p_c = R * (p - centroid)
   * p   = Rᵀ * p_c + centroid
   * ------------------------------------------------------ */

  const negCentroid = negVec3(c)

  const toCanonical = fromRotTrans(R, transform3(negCentroid, R))

  const Rt = transpose3(R)

  const fromCanonical = fromRotTrans(Rt, c)

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
    canonicalVertices.reduce<Vec3[]>((acc, _, i) => {
      if (i % 3 === 0) acc.push(newVec3(canonicalVertices[i], canonicalVertices[i + 1], canonicalVertices[i + 2]))
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

export function reconstructFromCanonical(canonical: Manifold, fromCanonical: Transform): Manifold {
  const mesh = canonical.getMesh()
  const v = transformMeshVertices(mesh, fromCanonical)
  return rebuildManifoldFromMesh(mesh, v)
}
