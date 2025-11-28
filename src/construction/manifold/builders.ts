import type { Manifold } from 'manifold-3d'

import type { BaseShape, CuboidShape, ExtrudedShape } from '@/construction/shapes'
import { ensurePolygonIsClockwise, ensurePolygonIsCounterClockwise } from '@/shared/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

import { cacheManifold, getOrCreateManifold, hasManifold } from './cache'

/**
 * Build manifold from construction parameters
 * Cuboids have corner at origin; extrusions positioned according to their plane
 */
export function buildManifold(params: BaseShape): Manifold {
  switch (params.type) {
    case 'cuboid':
      return buildCuboid(params)
    case 'extrusion':
      return buildExtrusion(params)
  }
}

/**
 * Build and cache manifold if not already cached
 */
export function buildAndCacheManifold(params: BaseShape): Manifold {
  if (hasManifold(params)) {
    return getOrCreateManifold(params)
  }

  const manifold = buildManifold(params)
  cacheManifold(params, manifold)
  return manifold
}

function buildCuboid(params: CuboidShape): Manifold {
  const module = getManifoldModule()
  const [w, h, d] = params.size

  // Create cube with corner at origin (center=false)
  // This aligns with application's corner-based positioning
  return module.Manifold.cube([w, h, d], false)
}

function buildExtrusion(params: ExtrudedShape): Manifold {
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

  // Apply transformation to map Manifold coordinates to application coordinates
  // Manifold extrudes XY polygon along Z, we need to orient it for each plane
  switch (plane) {
    case 'xy':
      // XY plane: polygon in XY, extrude along Z (up)
      // Manifold default is already correct: XY polygon extruded along Z
      break

    case 'xz':
      // XZ plane: polygon in XZ, extrude along Y (depth)
      // Need: Manifold X→X, Manifold Y→Z, Manifold Z→Y
      // prettier-ignore
      manifold = manifold.transform([
        1,        0,        0,        0, // X stays X
        0,        0,        1,        0, // Y becomes Z
        0,        1,        0,        0, // Z becomes Y
        0,        0,        0,        1
      ])
      break

    case 'yz':
      // YZ plane: polygon in YZ, extrude along X
      // Need: Manifold X→Y, Manifold Y→Z, Manifold Z→X
      // prettier-ignore
      manifold = manifold.transform([
        0,        1,        0,        0, // X becomes Y
        0,        0,        1,        0, // Y becomes Z
        1,        0,        0,        0, // Z becomes X
        0,        0,        0,        1
      ])
      break
  }

  return manifold
}
