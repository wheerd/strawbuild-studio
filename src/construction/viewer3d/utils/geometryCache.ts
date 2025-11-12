import * as THREE from 'three'

import type { GroupOrElement } from '@/construction/elements'
import type { ConstructionModel } from '@/construction/model'
import type { Cuboid, ExtrudedPolygon } from '@/construction/shapes'

type IdleCallback = (deadline?: { didTimeout: boolean; timeRemaining(): number }) => void

interface CuboidGeometryEntry {
  cacheKey: string
  geometry: THREE.BoxGeometry
  edgesGeometry: THREE.EdgesGeometry
}

interface ExtrudedGeometryEntry {
  cacheKey: string
  geometry: THREE.ExtrudeGeometry
  edgesGeometry: THREE.EdgesGeometry
  matrix: THREE.Matrix4
}

const cuboidGeometryCache = new Map<string, CuboidGeometryEntry>()
const extrudedGeometryCache = new Map<string, ExtrudedGeometryEntry>()
let activeGeometryConsumers = 0
let scheduledClearHandle: number | null = null
let scheduledClearType: 'idle' | 'timeout' | null = null

function disposeCuboidEntry(entry: CuboidGeometryEntry): void {
  entry.geometry.dispose()
  entry.edgesGeometry.dispose()
}

function disposeExtrudedEntry(entry: ExtrudedGeometryEntry): void {
  entry.geometry.dispose()
  entry.edgesGeometry.dispose()
}

function formatNumber(value: number): string {
  return Number.parseFloat(value.toFixed(6)).toString()
}

function vectorKey(values: ArrayLike<number>): string {
  return Array.from(values).map(formatNumber).join(',')
}

function sanitizePartId(partId?: string): string {
  return partId ?? 'no-part'
}

function getCuboidCacheKey(shape: Cuboid, partId?: string): string {
  const sizeKey = vectorKey(shape.size)
  return `cuboid|${sanitizePartId(partId)}|${sizeKey}`
}

function buildExtrudedPolygonGeometry(shape: ExtrudedPolygon): {
  geometry: THREE.ExtrudeGeometry
  matrix: THREE.Matrix4
} {
  const outerPoints = shape.polygon.outer.points.map(point => new THREE.Vector2(point[0], point[1]))
  const threeShape = new THREE.Shape(outerPoints)

  for (const hole of shape.polygon.holes) {
    const holePoints = hole.points.map(point => new THREE.Vector2(point[0], point[1]))
    const holePath = new THREE.Path(holePoints)
    threeShape.holes.push(holePath)
  }

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: Math.abs(shape.thickness),
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  }

  const geometry = new THREE.ExtrudeGeometry(threeShape, extrudeSettings)
  const matrix = new THREE.Matrix4()

  if (shape.plane === 'xy') {
    matrix.makeRotationX(-Math.PI / 2)
    if (shape.thickness < 0) {
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -shape.thickness))
    }
  } else if (shape.plane === 'xz') {
    matrix.makeScale(1, 1, -1)
    if (shape.thickness < 0) {
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -shape.thickness))
    }
  } else if (shape.plane === 'yz') {
    matrix.makeRotationY(Math.PI / 2)
    matrix.multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2))
    if (shape.thickness < 0) {
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -shape.thickness))
    }
  }

  return { geometry, matrix }
}

function getExtrudedPolygonCacheKey(shape: ExtrudedPolygon, partId?: string): string {
  const outerKey = shape.polygon.outer.points
    .map(point => `${formatNumber(point[0])}:${formatNumber(point[1])}`)
    .join(';')
  const holesKey =
    shape.polygon.holes.length === 0
      ? 'no-holes'
      : shape.polygon.holes
          .map(
            hole =>
              hole.points.map(point => `${formatNumber(point[0])}:${formatNumber(point[1])}`).join(';') || 'empty-hole'
          )
          .join('|')
  const planeKey = `${shape.plane}:${formatNumber(shape.thickness)}`
  return `polygon|${sanitizePartId(partId)}|${planeKey}|outer:${outerKey}|holes:${holesKey}`
}

export function getCuboidGeometry(shape: Cuboid, partId?: string): CuboidGeometryEntry {
  const cacheKey = getCuboidCacheKey(shape, partId)
  const cached = cuboidGeometryCache.get(cacheKey)
  if (cached) return cached

  const width = shape.size[0]
  const height = shape.size[1]
  const depth = shape.size[2]

  const geometry = new THREE.BoxGeometry(width, depth, height)
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 1)

  const entry = { cacheKey, geometry, edgesGeometry }
  cuboidGeometryCache.set(cacheKey, entry)
  return entry
}

export function getExtrudedPolygonGeometry(shape: ExtrudedPolygon, partId?: string): ExtrudedGeometryEntry {
  const cacheKey = getExtrudedPolygonCacheKey(shape, partId)
  const cached = extrudedGeometryCache.get(cacheKey)
  if (cached) return cached

  const { geometry, matrix } = buildExtrudedPolygonGeometry(shape)
  const edgesGeometry = new THREE.EdgesGeometry(geometry)

  const entry = { cacheKey, geometry, edgesGeometry, matrix }
  extrudedGeometryCache.set(cacheKey, entry)
  return entry
}

function prewarmElementGeometry(element: GroupOrElement): void {
  if ('children' in element) {
    element.children.forEach(child => prewarmElementGeometry(child))
    return
  }

  const partId = element.partInfo?.partId
  if (element.shape.type === 'cuboid') {
    getCuboidGeometry(element.shape, partId)
  } else if (element.shape.type === 'polygon') {
    getExtrudedPolygonGeometry(element.shape, partId)
  }
}

export function prewarmGeometryCache(model: ConstructionModel): void {
  model.elements.forEach(element => {
    prewarmElementGeometry(element)
  })
}

export function clearGeometryCache(): void {
  cuboidGeometryCache.forEach(entry => {
    disposeCuboidEntry(entry)
  })
  cuboidGeometryCache.clear()

  extrudedGeometryCache.forEach(entry => {
    disposeExtrudedEntry(entry)
  })
  extrudedGeometryCache.clear()
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
