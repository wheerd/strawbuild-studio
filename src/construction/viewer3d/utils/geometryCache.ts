import * as THREE from 'three'

import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import type { Shape } from '@/construction/shapes'
import type { Manifold } from '@/shared/geometry/manifoldInstance'

type IdleCallback = (deadline?: { didTimeout: boolean; timeRemaining(): number }) => void

interface GeometryEntry {
  cacheKey: string
  geometry: THREE.BufferGeometry
  edgesGeometry: THREE.EdgesGeometry
}

const geometryCache = new WeakMap<Manifold, GeometryEntry>()
const geometryEntries: GeometryEntry[] = []
let activeGeometryConsumers = 0
let scheduledClearHandle: number | null = null
let scheduledClearType: 'idle' | 'timeout' | null = null

function disposeEntry(entry: GeometryEntry): void {
  entry.geometry.dispose()
  entry.edgesGeometry.dispose()
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

    // Manifold (X,Y,Z) -> Three.js (X,Y,Z)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  // triVerts is already a Uint32Array
  const indices = mesh.triVerts

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()

  return geometry
}

let geometryCounter = 0

/**
 * Get Three.js geometry for a ManifoldShape
 */
export function getShapeGeometry(shape: Shape): GeometryEntry {
  const manifold = shape.manifold

  const cached = geometryCache.get(manifold)
  if (cached) return cached

  // Convert to Three.js geometry
  const geometry = manifoldToThreeGeometry(manifold)
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 1)

  const entry = { cacheKey: `geometry${geometryCounter++}`, geometry, edgesGeometry }
  geometryCache.set(manifold, entry)
  geometryEntries.push(entry)

  return entry
}

function prewarmElementGeometry(element: GroupOrElement): void {
  if ('children' in element) {
    element.children.forEach(child => {
      prewarmElementGeometry(child)
    })
    return
  }

  getShapeGeometry(element.shape)
}

export function prewarmGeometryCache(model: ConstructionModel): void {
  model.elements.forEach(element => {
    prewarmElementGeometry(element)
  })
}

export function clearGeometryCache(): void {
  geometryEntries.forEach(entry => {
    disposeEntry(entry)
  })
  geometryEntries.splice(0, geometryEntries.length)
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
