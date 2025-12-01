import { mat4, vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import { type ConstructionElement, createConstructionElement, createCuboidElement } from '@/construction/elements'
import { type WallConstructionArea } from '@/construction/geometry'
import { buildAndCacheManifold } from '@/construction/manifold/builders'
import type { MaterialId } from '@/construction/materials/material'
import { dimensionalPartInfo } from '@/construction/parts'
import type { Tag } from '@/construction/tags'
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

/**
 * Convert WallConstructionArea to ConstructionElement by extruding side profile along Y-axis
 * The side profile polygon is in the XZ plane and is extruded in the Y direction (wall depth)
 */
export function createElementFromArea(
  area: WallConstructionArea,
  materialId: MaterialId,
  tags?: Tag[],
  partType?: string,
  partDescription?: string
): ConstructionElement {
  const partInfo = partType ? dimensionalPartInfo(partType, area.size, partDescription) : undefined

  if (area.minHeight === area.size[2]) {
    return createCuboidElement(materialId, area.position, area.size, tags, partInfo)
  }

  const sideProfile = area.getSideProfilePolygon()

  // Create the polygon with holes structure (no holes for wall profiles)
  const polygon: PolygonWithHoles2D = {
    outer: sideProfile,
    holes: []
  }

  // Extrude along Y-axis (wall depth)
  const shape = createExtrudedPolygon(polygon, 'xz', area.size[1])

  // Create transform to position at area's Y position
  const transform = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, area.position[1], 0))

  return createConstructionElement(materialId, shape, transform, tags, partInfo)
}
