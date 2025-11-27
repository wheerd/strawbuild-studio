import type { Manifold } from 'manifold-3d'

import type { BooleanParams, ConstructionParams, CuboidParams, ExtrusionParams } from '@/construction/shapes'
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
  const outerPoints: [number, number][] = polygon.outer.points.map(p => [p[0], p[1]])

  // If we have holes, pass all contours at once (outer + holes)
  let crossSection: InstanceType<typeof module.CrossSection>
  if (polygon.holes.length > 0) {
    const allContours: [number, number][][] = [
      outerPoints,
      ...polygon.holes.map(hole => hole.points.map(p => [p[0], p[1]] as [number, number]))
    ]
    crossSection = module.CrossSection.ofPolygons(allContours)
  } else {
    crossSection = module.CrossSection.ofPolygons([outerPoints])
  }

  // Extrude in Z direction
  let manifold = crossSection.extrude(thickness)

  // Rotate to match requested plane
  switch (plane) {
    case 'xy':
      manifold = manifold.rotate([90, 0, 0])
      if (thickness < 0) {
        manifold = manifold.translate([0, -thickness, 0])
      }
      break

    case 'xz':
      if (thickness < 0) {
        manifold = manifold.translate([0, 0, -thickness])
      }
      break

    case 'yz':
      manifold = manifold.rotate([0, -90, 0])
      manifold = manifold.rotate([0, 0, -90])
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
