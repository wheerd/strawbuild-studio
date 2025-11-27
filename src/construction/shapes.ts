import { vec2, vec3 } from 'gl-matrix'

import type { Transform } from '@/construction/geometry'
import { IDENTITY } from '@/construction/geometry'
import { Bounds2D, Bounds3D, type Length, type Plane3D, type PolygonWithHoles2D } from '@/shared/geometry'

/**
 * Construction parameters define HOW to build a manifold
 * Used as cache key to reuse identical geometry
 */
export type ConstructionParams = CuboidParams | ExtrusionParams | BooleanParams

export interface CuboidParams {
  type: 'cuboid'
  size: vec3 // Width, height, depth
}

export interface ExtrusionParams {
  type: 'extrusion'
  polygon: PolygonWithHoles2D
  plane: Plane3D
  thickness: Length
}

export interface BooleanParams {
  type: 'boolean'
  operation: 'union' | 'subtract' | 'intersect'
  operands: ConstructionParams[]
}

export interface ManifoldShape {
  params: ConstructionParams
  bounds: Bounds3D
  // Reference to cached manifold (managed by cache)
  _cacheKey?: string
}

export type Shape = ManifoldShape

/**
 * Create a cuboid shape (centered at origin)
 * Use element transform to position it
 */
export function createCuboid(size: vec3): ManifoldShape {
  return {
    params: {
      type: 'cuboid',
      size: vec3.clone(size)
    },
    bounds: Bounds3D.fromCuboid(vec3.fromValues(-size[0] / 2, -size[1] / 2, -size[2] / 2), size)
  }
}

/**
 * Create an extruded polygon shape
 */
export function createExtrusion(polygon: PolygonWithHoles2D, plane: Plane3D, thickness: Length): ManifoldShape {
  const bounds2D = Bounds2D.fromPoints(polygon.outer.points)
  const minT = Math.min(thickness, 0)
  const maxT = Math.max(thickness, 0)
  const bounds3D = bounds2D.toBounds3D(plane, minT, maxT)

  return {
    params: {
      type: 'extrusion',
      polygon,
      plane,
      thickness
    },
    bounds: bounds3D
  }
}

/**
 * Create a shape from boolean operations
 */
export function createBoolean(operation: 'union' | 'subtract' | 'intersect', shapes: ManifoldShape[]): ManifoldShape {
  const operands = shapes.map(s => s.params)
  const bounds = Bounds3D.merge(...shapes.map(s => s.bounds))

  return {
    params: {
      type: 'boolean',
      operation,
      operands
    },
    bounds
  }
}

/**
 * Helper: Create a cuboid at a corner position (like old API)
 * Returns both the shape (centered) and transform to position it
 */
export function createCuboidAtCorner(corner: vec3, size: vec3): { shape: ManifoldShape; transform: Transform } {
  const shape = createCuboid(size)

  // Transform to move center to corner + size/2
  const transform: Transform = {
    position: vec3.fromValues(corner[0] + size[0] / 2, corner[1] + size[1] / 2, corner[2] + size[2] / 2),
    rotation: vec3.fromValues(0, 0, 0)
  }

  return { shape, transform }
}

/**
 * Helper: Extract equivalent "offset" from a centered cuboid + transform
 * Useful for migrating old code or parts list
 */
export function getCuboidCorner(size: vec3, transform: Transform): vec3 {
  return vec3.fromValues(
    transform.position[0] - size[0] / 2,
    transform.position[1] - size[1] / 2,
    transform.position[2] - size[2] / 2
  )
}

/**
 * DEPRECATED: Use createCuboidElement() from elements.ts instead.
 * This helper is kept for test compatibility only.
 *
 * Creates a cuboid shape at origin. For positioned cuboids, use:
 * - createCuboidElement(material, corner, size, tags, partInfo)
 * - or createCuboidAtCorner(corner, size) then createConstructionElement()
 */
export function createCuboidShape(_offset: vec3, size: vec3): ManifoldShape {
  // Just create a centered cuboid - caller should use createCuboidElement instead
  return createCuboid(size)
}

/**
 * MIGRATION HELPER: Old createExtrudedPolygon API
 * Now returns centered shape (use element transform for positioning)
 */
export function createExtrudedPolygon(polygon: PolygonWithHoles2D, plane: Plane3D, thickness: Length): ManifoldShape {
  return createExtrusion(polygon, plane, thickness)
}

// Legacy types for backwards compatibility
export interface Cuboid extends ManifoldShape {
  offset: vec3
  size: vec3
}

export interface ExtrudedPolygon extends ManifoldShape {
  polygon: PolygonWithHoles2D
  plane: Plane3D
  thickness: Length
}

/**
 * Legacy helper to get cuboid-like properties from ManifoldShape
 */
export function getCuboidProperties(shape: ManifoldShape, transform: Transform = IDENTITY): Cuboid | null {
  if (shape.params.type !== 'cuboid') return null

  return {
    ...shape,
    offset: getCuboidCorner(shape.params.size, transform),
    size: shape.params.size
  }
}

/**
 * Legacy helper to get extruded polygon properties from ManifoldShape
 */
export function getExtrudedPolygonProperties(shape: ManifoldShape): ExtrudedPolygon | null {
  if (shape.params.type !== 'extrusion') return null

  return {
    ...shape,
    polygon: shape.params.polygon,
    plane: shape.params.plane,
    thickness: shape.params.thickness
  }
}

export interface Face3D {
  outer: vec3[]
  holes: vec3[][]
}

function point2DTo3D(p: vec2, plane: Plane3D, z: number) {
  switch (plane) {
    case 'xy':
      return vec3.fromValues(p[0], p[1], z)
    case 'xz':
      return vec3.fromValues(p[0], z, p[1])
    case 'yz':
      return vec3.fromValues(z, p[0], p[1])
  }
}

export function* extrudedPolygonFaces(shape: ManifoldShape): Generator<Face3D> {
  const props = getExtrudedPolygonProperties(shape)
  if (!props) return

  const { polygon, plane, thickness } = props

  yield {
    outer: polygon.outer.points.map(p => point2DTo3D(p, plane, 0)),
    holes: polygon.holes.map(h => h.points.map(p => point2DTo3D(p, plane, 0)))
  }
  yield {
    outer: polygon.outer.points.map(p => point2DTo3D(p, plane, thickness)),
    holes: polygon.holes.map(h => h.points.map(p => point2DTo3D(p, plane, thickness)))
  }
  const op = polygon.outer.points
  for (let i = 0; i < op.length; i++) {
    yield {
      outer: [
        point2DTo3D(op[i], plane, 0),
        point2DTo3D(op[(i + 1) % op.length], plane, 0),
        point2DTo3D(op[(i + 1) % op.length], plane, thickness),
        point2DTo3D(op[i], plane, thickness)
      ],
      holes: []
    }
  }
  for (const hole of polygon.holes) {
    const op = hole.points
    for (let i = 0; i < op.length; i++) {
      yield {
        outer: [
          point2DTo3D(op[i], plane, 0),
          point2DTo3D(op[(i + 1) % op.length], plane, 0),
          point2DTo3D(op[(i + 1) % op.length], plane, thickness),
          point2DTo3D(op[i], plane, thickness)
        ],
        holes: []
      }
    }
  }
}
