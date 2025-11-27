import { vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { ConstructionParams } from '@/construction/shapes'

/**
 * Global cache: ConstructionParams -> Manifold
 * Shared across all shapes with identical geometry
 */
const manifoldCache = new Map<string, Manifold>()

/**
 * Generate cache key from construction parameters
 */
export function getParamsCacheKey(params: ConstructionParams): string {
  switch (params.type) {
    case 'cuboid':
      return `cuboid|${formatVec3(params.size)}`

    case 'extrusion': {
      const outerKey = params.polygon.outer.points.map(p => `${formatNumber(p[0])}:${formatNumber(p[1])}`).join(';')
      const holesKey =
        params.polygon.holes.length === 0
          ? 'none'
          : params.polygon.holes
              .map(h => h.points.map(p => `${formatNumber(p[0])}:${formatNumber(p[1])}`).join(';'))
              .join('|')
      return `extrusion|${params.plane}|${formatNumber(params.thickness)}|${outerKey}|${holesKey}`
    }

    case 'boolean': {
      const operandKeys = params.operands.map(getParamsCacheKey).join('&')
      return `boolean|${params.operation}|${operandKeys}`
    }
  }
}

/**
 * Get or create manifold from construction parameters
 */
export function getOrCreateManifold(params: ConstructionParams): Manifold {
  const cacheKey = getParamsCacheKey(params)

  const manifold = manifoldCache.get(cacheKey)
  if (manifold) {
    return manifold
  }

  // Will be built by builders.ts
  throw new Error(`Manifold not in cache for key: ${cacheKey}. Use buildAndCacheManifold() first.`)
}

/**
 * Store a manifold in the cache
 */
export function cacheManifold(params: ConstructionParams, manifold: Manifold): void {
  const cacheKey = getParamsCacheKey(params)
  manifoldCache.set(cacheKey, manifold)
}

/**
 * Check if manifold is cached
 */
export function hasManifold(params: ConstructionParams): boolean {
  const cacheKey = getParamsCacheKey(params)
  return manifoldCache.has(cacheKey)
}

/**
 * Clear cache (useful for memory management)
 */
export function clearManifoldCache(): void {
  manifoldCache.clear()
}

function formatNumber(n: number): string {
  return Number.parseFloat(n.toFixed(6)).toString()
}

function formatVec3(v: vec3): string {
  return `${formatNumber(v[0])},${formatNumber(v[1])},${formatNumber(v[2])}`
}
