import { BufferAttribute, BufferGeometry } from 'three'

import type { Length, Polygon2D, Vec2 } from '@/shared/geometry'
import { projectVec2 } from '@/shared/geometry'

export function createSlopedExtrudedGeometry(polygon: Polygon2D, vertexZHeights: Length[]): BufferGeometry {
  const numVertices = polygon.points.length

  const positions = new Float32Array(numVertices * 3)
  for (let i = 0; i < numVertices; i++) {
    positions[i * 3] = polygon.points[i][0]
    positions[i * 3 + 1] = polygon.points[i][1]
    positions[i * 3 + 2] = vertexZHeights[i]
  }

  const indices = new Uint16Array((numVertices - 2) * 3)
  let idx = 0
  for (let i = 0; i < numVertices - 2; i++) {
    indices[idx++] = 0
    indices[idx++] = i + 1
    indices[idx++] = i + 2
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(Array.from(indices))
  geometry.computeVertexNormals()

  return geometry
}

export function calculateSlopedAreaVertexHeights(
  polygon: Polygon2D,
  base: Vec2,
  downSlopeDir: Vec2,
  angleRad: number,
  baseOffset: Length,
  invert: boolean
): number[] {
  const vertexHeights: Length[] = []
  for (const point of polygon.points) {
    const signedDist = projectVec2(base, point, downSlopeDir)
    const offset = baseOffset + signedDist * -Math.tan(angleRad)
    vertexHeights.push(invert ? -offset : offset)
  }

  return vertexHeights
}
