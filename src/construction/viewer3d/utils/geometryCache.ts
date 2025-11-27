import * as THREE from 'three'

import type { GroupOrElement } from '@/construction/elements'
import { buildAndCacheManifold } from '@/construction/manifold/builders'
import { getParamsCacheKey } from '@/construction/manifold/cache'
import type { ConstructionModel } from '@/construction/model'
import type { ManifoldShape } from '@/construction/shapes'
import type { Manifold } from '@/shared/geometry/manifoldInstance'

type IdleCallback = (deadline?: { didTimeout: boolean; timeRemaining(): number }) => void

interface GeometryEntry {
  cacheKey: string
  geometry: THREE.BufferGeometry
  edgesGeometry: THREE.EdgesGeometry
}

const geometryCache = new Map<string, GeometryEntry>()
let activeGeometryConsumers = 0
let scheduledClearHandle: number | null = null
let scheduledClearType: 'idle' | 'timeout' | null = null

function disposeEntry(entry: GeometryEntry): void {
  entry.geometry.dispose()
  entry.edgesGeometry.dispose()
}

function sanitizePartId(partId?: string): string {
  return partId ?? 'no-part'
}

/**
 * Convert Manifold to Three.js BufferGeometry
 */
function manifoldToThreeGeometry(manifold: Manifold): THREE.BufferGeometry {
  const mesh = manifold.getMesh()

  // vertProperties is flat array: [x,y,z, ...props, x,y,z, ...props, ...]
  // numProp tells us stride (always >= 3)
  const numVerts = mesh.vertProperties.length / mesh.numProp
  const positions = new Float32Array(numVerts * 3)

  for (let i = 0; i < numVerts; i++) {
    const baseIdx = i * mesh.numProp
    const x = mesh.vertProperties[baseIdx]
    const y = mesh.vertProperties[baseIdx + 1]
    const z = mesh.vertProperties[baseIdx + 2]

    // Manifold (X,Y,Z) -> Three.js (X,Z,-Y)
    positions[i * 3] = x
    positions[i * 3 + 1] = z
    positions[i * 3 + 2] = -y
  }

  // triVerts is already a Uint32Array
  const indices = mesh.triVerts

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Get Three.js geometry for a ManifoldShape
 */
export function getShapeGeometry(shape: ManifoldShape, partId?: string): GeometryEntry {
  // Cache key includes partId for per-part geometry variations
  const paramKey = getParamsCacheKey(shape.params)
  const cacheKey = `${paramKey}|${sanitizePartId(partId)}`

  const cached = geometryCache.get(cacheKey)
  if (cached) return cached

  // Get or build manifold (from global manifold cache)
  const manifold = buildAndCacheManifold(shape.params)

  // Convert to Three.js geometry
  const geometry = manifoldToThreeGeometry(manifold)
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 1)

  const entry = { cacheKey, geometry, edgesGeometry }
  geometryCache.set(cacheKey, entry)

  return entry
}

// Legacy exports for backwards compatibility during migration
export function getCuboidGeometry(shape: ManifoldShape, partId?: string): GeometryEntry {
  return getShapeGeometry(shape, partId)
}

export function getExtrudedPolygonGeometry(shape: ManifoldShape, partId?: string): GeometryEntry {
  return getShapeGeometry(shape, partId)
}

function prewarmElementGeometry(element: GroupOrElement): void {
  if ('children' in element) {
    element.children.forEach(child => prewarmElementGeometry(child))
    return
  }

  const partId = element.partInfo?.partId
  getShapeGeometry(element.shape, partId)
}

export function prewarmGeometryCache(model: ConstructionModel): void {
  model.elements.forEach(element => {
    prewarmElementGeometry(element)
  })
}

export function clearGeometryCache(): void {
  geometryCache.forEach(entry => {
    disposeEntry(entry)
  })
  geometryCache.clear()
}

export function acquireGeometryCache(): void {
  cancelScheduledGeometryCacheClear()
  activeGeometryConsumers += 1
}

export function releaseGeometryCache(): void {
  if (activeGeometryConsumers === 0) {
    return
  }

  activeGeometryConsumers -= 1
  if (activeGeometryConsumers === 0) {
    scheduleGeometryCacheClear()
  }
}

function scheduleGeometryCacheClear(): void {
  if (scheduledClearHandle !== null) {
    return
  }

  const run: IdleCallback = () => {
    scheduledClearHandle = null
    scheduledClearType = null
    clearGeometryCache()
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    scheduledClearType = 'idle'
    scheduledClearHandle = window.requestIdleCallback(run)
    return
  }

  if (typeof globalThis !== 'undefined') {
    const maybeRequestIdle = (globalThis as { requestIdleCallback?: (cb: IdleCallback) => number }).requestIdleCallback
    if (typeof maybeRequestIdle === 'function') {
      scheduledClearType = 'idle'
      scheduledClearHandle = maybeRequestIdle(run)
      return
    }
  }

  scheduledClearType = 'timeout'
  scheduledClearHandle = Number(setTimeout(run, 0))
}

function cancelScheduledGeometryCacheClear(): void {
  if (scheduledClearHandle === null) {
    return
  }

  if (scheduledClearType === 'idle') {
    if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(scheduledClearHandle)
    } else if (typeof globalThis !== 'undefined') {
      const maybeCancel = (globalThis as { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback
      if (typeof maybeCancel === 'function') {
        maybeCancel(scheduledClearHandle)
      }
    }
  } else if (scheduledClearType === 'timeout') {
    clearTimeout(scheduledClearHandle)
  }

  scheduledClearHandle = null
  scheduledClearType = null
}
