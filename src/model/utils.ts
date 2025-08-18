import type { Point2D, Vector2D, Bounds } from '../types/model'

export function distance (p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function midpoint (p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  }
}

export function angle (from: Point2D, to: Point2D): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.atan2(dy, dx)
}

export function normalizeAngle (angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

export function pointOnLine (start: Point2D, end: Point2D, t: number): Point2D {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  }
}

export function vectorFromAngle (angle: number, length: number = 1): Vector2D {
  return {
    x: Math.cos(angle) * length,
    y: Math.sin(angle) * length
  }
}

export function addVector (point: Point2D, vector: Vector2D): Point2D {
  return {
    x: point.x + vector.x,
    y: point.y + vector.y
  }
}

export function snapToGrid (point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

export function expandBounds (bounds: Bounds, padding: number): Bounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding
  }
}

export function pointInBounds (point: Point2D, bounds: Bounds): boolean {
  return point.x >= bounds.minX &&
         point.x <= bounds.maxX &&
         point.y >= bounds.minY &&
         point.y <= bounds.maxY
}

export function boundsFromPoints (points: Point2D[]): Bounds | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, minY, maxX, maxY }
}

export function isPointNearLine (
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D,
  tolerance: number = 5
): boolean {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) return distance(point, lineStart) <= tolerance

  const param = dot / lenSq

  let closestPoint: Point2D

  if (param < 0) {
    closestPoint = lineStart
  } else if (param > 1) {
    closestPoint = lineEnd
  } else {
    closestPoint = {
      x: lineStart.x + param * C,
      y: lineStart.y + param * D
    }
  }

  return distance(point, closestPoint) <= tolerance
}

export function formatDistance (distanceInMM: number, unit: 'mm' | 'cm' | 'm' = 'm'): string {
  switch (unit) {
    case 'mm':
      return `${distanceInMM.toFixed(0)}mm`
    case 'cm':
      return `${(distanceInMM / 10).toFixed(1)}cm`
    case 'm':
      return `${(distanceInMM / 1000).toFixed(2)}m`
    default:
      return `${distanceInMM.toFixed(0)}`
  }
}

export function formatArea (areaInSquareMM: number, unit: 'mm²' | 'cm²' | 'm²' = 'm²'): string {
  switch (unit) {
    case 'mm²':
      return `${areaInSquareMM.toFixed(0)}mm²`
    case 'cm²':
      return `${(areaInSquareMM / 100).toFixed(1)}cm²`
    case 'm²':
      return `${(areaInSquareMM / 1000000).toFixed(2)}m²`
    default:
      return `${areaInSquareMM.toFixed(0)}`
  }
}

export function offsetToPosition (startPoint: Point2D, endPoint: Point2D, offset: number): Point2D {
  const dx = endPoint.x - startPoint.x
  const dy = endPoint.y - startPoint.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return startPoint

  const t = offset / length

  return {
    x: startPoint.x + dx * t,
    y: startPoint.y + dy * t
  }
}
