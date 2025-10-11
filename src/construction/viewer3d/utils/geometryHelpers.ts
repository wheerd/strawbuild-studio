import type { CutCuboid } from '@/construction/shapes'
import type { Vec3 } from '@/shared/geometry'

interface CutCuboidVertices {
  vertices: Float32Array
  indices: Uint16Array
}

export function computeCutCuboidVertices(shape: CutCuboid): CutCuboidVertices {
  const [x, y, z] = shape.offset
  const [w, h, d] = shape.size

  const startCut = shape.startCut
  const endCut = shape.endCut

  let v0: Vec3, v1: Vec3, v2: Vec3, v3: Vec3
  let v4: Vec3, v5: Vec3, v6: Vec3, v7: Vec3

  if (startCut?.plane === 'xy' && startCut?.axis === 'y') {
    const angleRad = (startCut.angle * Math.PI) / 180
    const offsetDistance = h * Math.tan(angleRad)

    if (offsetDistance < 0) {
      v0 = [x - offsetDistance, z, -y]
      v3 = [x, z, -(y + h)]
      v4 = [x - offsetDistance, z + d, -y]
      v7 = [x, z + d, -(y + h)]
    } else {
      v0 = [x, z, -y]
      v3 = [x + offsetDistance, z, -(y + h)]
      v4 = [x, z + d, -y]
      v7 = [x + offsetDistance, z + d, -(y + h)]
    }
  } else {
    v0 = [x, z, -y]
    v3 = [x, z, -(y + h)]
    v4 = [x, z + d, -y]
    v7 = [x, z + d, -(y + h)]
  }

  if (endCut?.plane === 'xy' && endCut?.axis === 'y') {
    const angleRad = (endCut.angle * Math.PI) / 180
    const offsetDistance = h * Math.tan(angleRad)

    if (offsetDistance < 0) {
      v1 = [x + w, z, -y]
      v2 = [x + w + offsetDistance, z, -(y + h)]
      v5 = [x + w, z + d, -y]
      v6 = [x + w + offsetDistance, z + d, -(y + h)]
    } else {
      v1 = [x + w - offsetDistance, z, -y]
      v2 = [x + w, z, -(y + h)]
      v5 = [x + w - offsetDistance, z + d, -y]
      v6 = [x + w, z + d, -(y + h)]
    }
  } else {
    v1 = [x + w, z, -y]
    v2 = [x + w, z, -(y + h)]
    v5 = [x + w, z + d, -y]
    v6 = [x + w, z + d, -(y + h)]
  }

  const vertices = new Float32Array([...v0, ...v1, ...v2, ...v3, ...v4, ...v5, ...v6, ...v7])

  const indices = new Uint16Array([
    // Bottom face (y edge at z)
    0, 1, 4, 1, 5, 4,
    // Top face (y+h edge at z)
    3, 7, 2, 2, 7, 6,
    // Start face (x=0)
    0, 4, 3, 4, 7, 3,
    // End face (x=w)
    1, 2, 5, 2, 6, 5,
    // Front face (z)
    0, 3, 1, 1, 3, 2,
    // Back face (z+d)
    4, 5, 7, 5, 6, 7
  ])

  return { vertices, indices }
}
