import type { mat4 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import { Bounds3D } from '@/shared/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

/**
 * Intersect two manifolds
 */
export function intersectManifolds(a: Manifold, b: Manifold): Manifold {
  return a.intersect(b)
}

/**
 * Subtract manifold b from manifold a
 */
export function subtractManifolds(a: Manifold, b: Manifold): Manifold {
  return a.subtract(b)
}

/**
 * Union multiple manifolds into one
 */
export function unionManifolds(manifolds: Manifold[]): Manifold {
  if (manifolds.length === 0) {
    throw new Error('Cannot union empty array of manifolds')
  }
  if (manifolds.length === 1) {
    return manifolds[0]
  }

  // Use batch union for better performance
  const module = getManifoldModule()
  return module.Manifold.union(manifolds)
}

/**
 * Transform a manifold by a 4x4 transformation matrix
 */
export function transformManifold(manifold: Manifold, transform: mat4): Manifold {
  // Manifold.transform expects a 16-element array in column-major order (same as gl-matrix mat4)
  // Convert mat4 to array
  const transformArray = Array.from(transform) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ]

  return manifold.transform(transformArray)
}

/**
 * Get bounds from a manifold's bounding box
 */
export function getBoundsFromManifold(manifold: Manifold): Bounds3D {
  const bbox = manifold.boundingBox()
  return Bounds3D.fromMinMax([bbox.min[0], bbox.min[1], bbox.min[2]], [bbox.max[0], bbox.max[1], bbox.max[2]])
}
