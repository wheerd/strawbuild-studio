import { mat3, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

export interface OBB {
  center: vec3
  axes: [vec3, vec3, vec3]
  halfSizes: vec3
  volume: number
  /** 8 corners in world coordinates (useful for visualization) */
  corners: vec3[]
  /** rotation matrix (columns are axes): mat3.fromValues(x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z) */
  rotation: mat3
}

/**
 * Compute the minimum-volume oriented bounding box (approx / practical method)
 * for a Manifold-like object. The function expects the manifold to either:
 *  - expose a .convexHull() method returning another manifold (preferred), or
 *  - at least expose .getMesh() that returns { vertProperties: number[], triVerts: number[] }
 *
 * If the input doesn't have convexHull, this still runs on the original mesh.
 *
 * @param manifold - the manifold object
 */
export function computeMinimumVolumeOBB(manifold: Manifold): OBB {
  let hull = manifold.hull()
  const mesh = hull.getMesh()

  // Expect mesh.vertProperties as flat array [x0,y0,z0, x1,y1,z1, ...]
  const verts: vec3[] = []
  const vprops = mesh.vertProperties
  for (let i = 0; i + 2 < vprops.length; i += 3) {
    verts.push(vec3.fromValues(vprops[i], vprops[i + 1], vprops[i + 2]))
  }

  const triVerts = mesh.triVerts

  // helper: compute triangle normal
  const triNormal = (i0: number, i1: number, i2: number, out: vec3) => {
    const a = verts[i0]
    const b = verts[i1]
    const c = verts[i2]
    const ab = vec3.sub(vec3.create(), b, a)
    const ac = vec3.sub(vec3.create(), c, a)
    vec3.cross(out, ab, ac)
    const len = vec3.length(out)
    if (len > 0) vec3.scale(out, out, 1 / len)
    else vec3.set(out, 0, 0, 0)
  }

  // iterate every triangle as candidate orientation
  let best: OBB | null = null
  const triCount = Math.floor(triVerts.length / 3)

  for (let ti = 0; ti < triCount; ti++) {
    const i0 = triVerts[3 * ti]
    const i1 = triVerts[3 * ti + 1]
    const i2 = triVerts[3 * ti + 2]

    // compute normal (Z axis)
    const z = vec3.create()
    triNormal(i0, i1, i2, z)
    if (vec3.squaredLength(z) < 1e-12) continue // degenerate face

    // choose an edge direction as initial X (try edge i1-i0)
    const edge = vec3.sub(vec3.create(), verts[i1], verts[i0])
    // orthogonalize edge to z: x = normalize(edge - (edge·z) z)
    const proj = vec3.scale(vec3.create(), z, vec3.dot(edge, z))
    const x = vec3.sub(vec3.create(), edge, proj)
    if (vec3.squaredLength(x) < 1e-12) {
      // if that edge is parallel to normal, try another edge i2-i0
      const edge2 = vec3.sub(vec3.create(), verts[i2], verts[i0])
      const proj2 = vec3.scale(vec3.create(), z, vec3.dot(edge2, z))
      vec3.sub(x, edge2, proj2)
      if (vec3.squaredLength(x) < 1e-12) continue // can't form basis here
    }
    vec3.normalize(x, x)

    // y = z cross x (ensures right-handed orthonormal frame)
    const y = vec3.cross(vec3.create(), z, x)
    vec3.normalize(y, y)

    // build rotation axes (columns)
    // We will compute coordinates by dot(p, axis) for each axis
    // For numerical stability, prefer storing axes as normalized vec3s
    // axes: x, y, z
    // project all vertices into this local frame and compute bounding box
    let minX = Number.POSITIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      minZ = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY,
      maxZ = Number.NEGATIVE_INFINITY

    for (let vi = 0; vi < verts.length; vi++) {
      const p = verts[vi]
      const px = vec3.dot(p, x)
      const py = vec3.dot(p, y)
      const pz = vec3.dot(p, z)

      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      if (pz < minZ) minZ = pz
      if (pz > maxZ) maxZ = pz
    }

    const sizeX = maxX - minX
    const sizeY = maxY - minY
    const sizeZ = maxZ - minZ

    // if any dimension degenerate, skip
    if (sizeX <= 0 || sizeY <= 0 || sizeZ <= 0) continue

    const volume = sizeX * sizeY * sizeZ

    if (best === null || volume < best.volume) {
      // build center in local coords and convert to world
      const cx = (minX + maxX) * 0.5
      const cy = (minY + maxY) * 0.5
      const cz = (minZ + maxZ) * 0.5

      // worldCenter = x*cx + y*cy + z*cz
      const center = vec3.create()
      const tmp = vec3.create()
      vec3.scale(tmp, x, cx)
      vec3.add(center, center, tmp)
      vec3.scale(tmp, y, cy)
      vec3.add(center, center, tmp)
      vec3.scale(tmp, z, cz)
      vec3.add(center, center, tmp)

      const halfSizes = vec3.fromValues(sizeX * 0.5, sizeY * 0.5, sizeZ * 0.5)

      // rotation matrix: columns are axes x,y,z
      const rotation = mat3.fromValues(x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2])

      // compute 8 corners in world coords: ±halfSizes along axes added to center
      const corners: vec3[] = []
      for (let sx = -1; sx <= 1; sx += 2) {
        for (let sy = -1; sy <= 1; sy += 2) {
          for (let sz = -1; sz <= 1; sz += 2) {
            const offset = vec3.create()
            vec3.scale(tmp, x, sx * halfSizes[0])
            vec3.add(offset, offset, tmp)
            vec3.scale(tmp, y, sy * halfSizes[1])
            vec3.add(offset, offset, tmp)
            vec3.scale(tmp, z, sz * halfSizes[2])
            vec3.add(offset, offset, tmp)
            const corner = vec3.add(vec3.create(), center, offset)
            corners.push(corner)
          }
        }
      }

      best = {
        center,
        axes: [vec3.clone(x), vec3.clone(y), vec3.clone(z)],
        halfSizes,
        volume,
        corners,
        rotation
      }
    }
  } // end tri loop

  if (!best) {
    throw new Error('Failed to compute OBB: degenerate mesh or no valid candidate orientations')
  }

  return best
}
