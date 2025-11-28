import type { Manifold } from 'manifold-3d'

import type { BooleanParams, ConstructionParams, CuboidParams, ExtrusionParams } from '@/construction/shapes'
import { ensurePolygonIsClockwise, ensurePolygonIsCounterClockwise } from '@/shared/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

import { cacheManifold, getOrCreateManifold, hasManifold } from './cache'

/**
 * Build manifold from construction parameters
 * All manifolds are centered at origin or positioned according to their params
 */
export function buildManifold(params: ConstructionParams): Manifold {
  switch (params.type) {
    case 'cuboid':
      return buildCuboid(params)
    case 'extrusion':
      return buildExtrusion(params)
    case 'boolean':
      return buildBoolean(params)
  }
}

/**
 * Build and cache manifold if not already cached
 */
export function buildAndCacheManifold(params: ConstructionParams): Manifold {
  if (hasManifold(params)) {
    return getOrCreateManifold(params)
  }

  const manifold = buildManifold(params)
  cacheManifold(params, manifold)
  return manifold
}

function buildCuboid(params: CuboidParams): Manifold {
  const module = getManifoldModule()
  const [w, h, d] = params.size

  // Manifold.cube is centered at origin - perfect!
  return module.Manifold.cube([w, h, d], true)
}

function buildExtrusion(params: ExtrusionParams): Manifold {
  const module = getManifoldModule()
  const { polygon, plane, thickness } = params

  // Build CrossSection from polygon with holes
  const outerPoints: [number, number][] = ensurePolygonIsCounterClockwise(polygon.outer).points.map(p => [p[0], p[1]])

  // If we have holes, pass all contours at once (outer + holes)
  let crossSection: InstanceType<typeof module.CrossSection>
  if (polygon.holes.length > 0) {
    const allContours: [number, number][][] = [
      outerPoints,
      ...polygon.holes.map(hole => ensurePolygonIsClockwise(hole).points.map(p => [p[0], p[1]] as [number, number]))
    ]
    crossSection = module.CrossSection.ofPolygons(allContours, 'EvenOdd')
  } else {
    crossSection = module.CrossSection.ofPolygons([outerPoints], 'EvenOdd')
  }

  // Extrude in Z direction (Manifold extrudes along +Z by default)
  let manifold = crossSection.extrude(thickness)

  // Rotate to match requested plane
  // Manifold.rotate() takes DEGREES, not radians
  // Manifold extrudes a 2D polygon (in XY) along +Z
  // After manifoldToThreeGeometry conversion (X,Y,Z) -> (X,Z,-Y):
  // - Manifold +Z becomes Three.js +Y
  // - Manifold +Y becomes Three.js -Z
  // - Manifold +X stays Three.js +X
  //
  // Plane meanings (in application coordinates):
  // - 'xy': polygon in XY plane, extrude along Z (floor/ceiling)
  // - 'xz': polygon in XZ plane, extrude along Y (walls)
  // - 'yz': polygon in YZ plane, extrude along X (walls perpendicular to X)

  switch (plane) {
    case 'xy':
      // XY plane: polygon in XY, extrude along Y (floor/ceiling)
      // Manifold extruded along Z. After (X,Y,Z)->(X,Z,-Y), Z becomes Y.
      // This is exactly what we want! No rotation needed.
      // Just handle negative thickness
      if (thickness < 0) {
        manifold = manifold.translate([0, 0, -thickness])
      }
      break

    case 'xz':
      // XZ plane: polygon in XZ, extrude along Y (depth direction)
      // Manifold has polygon in XY, extruded along Z
      // Old Three.js code used scale(1,1,-1) to flip extrusion direction
      // We mirror in Z to reverse extrusion direction
      manifold = manifold.scale([1, 1, -1])
      // Now rotate so XY becomes XZ, and extrusion (Z) becomes Y direction
      // Rotate 90° around X: (X,Y,Z) -> (X, -Z, Y)
      manifold = manifold.rotate([90, 0, 0])
      if (thickness < 0) {
        manifold = manifold.translate([0, thickness, 0])
      }
      break

    case 'yz':
      // YZ plane: polygon in YZ, extrude along X
      // Manifold has polygon in XY, extruded along Z
      // Need to rotate so XY becomes YZ, and extrusion (Z) becomes X direction
      // Rotate -90° around Y: (X,Y,Z) -> (Z, Y, -X)
      // Then extrusion Z becomes position X ✓
      manifold = manifold.rotate([0, -90, 0])
      if (thickness < 0) {
        manifold = manifold.translate([-thickness, 0, 0])
      }
      break
  }

  return manifold
}

function buildBoolean(params: BooleanParams): Manifold {
  if (params.operands.length === 0) {
    throw new Error('Boolean operation requires at least one operand')
  }

  // Build all operand manifolds (will be cached individually)
  const manifolds = params.operands.map(buildAndCacheManifold)

  let result = manifolds[0]
  for (let i = 1; i < manifolds.length; i++) {
    switch (params.operation) {
      case 'union':
        result = result.add(manifolds[i])
        break
      case 'subtract':
        result = result.subtract(manifolds[i])
        break
      case 'intersect':
        result = result.intersect(manifolds[i])
        break
    }
  }

  return result
}
