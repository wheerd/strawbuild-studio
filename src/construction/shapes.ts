import { vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import { buildAndCacheManifold } from '@/construction/manifold/builders'
import { Bounds2D, Bounds3D, type Length, type Plane3D, type PolygonWithHoles2D } from '@/shared/geometry'

export type BaseShape = CuboidShape | ExtrudedShape

export interface CuboidShape {
  type: 'cuboid'
  size: vec3 // Width, height, depth
}

export interface ExtrudedShape {
  type: 'extrusion'
  polygon: PolygonWithHoles2D
  plane: Plane3D
  thickness: Length
}

export interface Shape {
  manifold: Manifold
  base?: BaseShape
  bounds: Bounds3D
}

/**
 * Create a cuboid shape with corner at origin
 * Use element transform to position it
 */
export function createCuboid(size: vec3): Shape {
  const base: CuboidShape = {
    type: 'cuboid',
    size: vec3.clone(size)
  }
  return {
    manifold: buildAndCacheManifold(base),
    base,
    bounds: Bounds3D.fromCuboid(vec3.fromValues(0, 0, 0), size)
  }
}

/**
 * Create an extruded polygon shape
 */
export function createExtrudedPolygon(polygon: PolygonWithHoles2D, plane: Plane3D, thickness: Length): Shape {
  const bounds2D = Bounds2D.fromPoints(polygon.outer.points)
  const minT = Math.min(thickness, 0)
  const maxT = Math.max(thickness, 0)
  const bounds3D = bounds2D.toBounds3D(plane, minT, maxT)
  const base: ExtrudedShape = {
    type: 'extrusion',
    polygon,
    plane,
    thickness
  }

  return {
    manifold: buildAndCacheManifold(base),
    base,
    bounds: bounds3D
  }
}
