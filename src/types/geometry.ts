// Branded numeric types for type safety
export type AbsoluteOffset = number & { __brand: 'AbsoluteOffset' }
export type Length = number & { __brand: 'Length' }
export type Area = number & { __brand: 'Area' }
export type Angle = number & { __brand: 'Angle' }

// Helper functions to create branded types
export const createAbsoluteOffset = (value: number): AbsoluteOffset => value as AbsoluteOffset
export const createLength = (value: number): Length => value as Length
export const createArea = (value: number): Area => value as Area
export const createAngle = (value: number): Angle => value as Angle

// Core geometric types
export interface Point2D {
  x: AbsoluteOffset
  y: AbsoluteOffset
}

export interface Vector2D {
  x: Length
  y: Length
}

export interface Bounds2D {
  minX: AbsoluteOffset
  minY: AbsoluteOffset
  maxX: AbsoluteOffset
  maxY: AbsoluteOffset
}

export interface Polygon2D {
  points: Point2D[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

// Geometry utility functions
export function distance(p1: Point2D, p2: Point2D): Length {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return createLength(Math.sqrt(dx * dx + dy * dy))
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: createAbsoluteOffset((p1.x + p2.x) / 2),
    y: createAbsoluteOffset((p1.y + p2.y) / 2)
  }
}

export function angle(from: Point2D, to: Point2D): Angle {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return createAngle(Math.atan2(dy, dx))
}

export function normalizeAngle(angle: Angle): Angle {
  let normalized = Number(angle)
  while (normalized > Math.PI) normalized -= 2 * Math.PI
  while (normalized < -Math.PI) normalized += 2 * Math.PI
  return createAngle(normalized)
}

export function pointOnLine(start: Point2D, end: Point2D, t: number): Point2D {
  return {
    x: createAbsoluteOffset(start.x + (end.x - start.x) * t),
    y: createAbsoluteOffset(start.y + (end.y - start.y) * t)
  }
}

export function vectorFromAngle(angle: Angle, length: Length = createLength(1)): Vector2D {
  return {
    x: createLength(Math.cos(angle) * length),
    y: createLength(Math.sin(angle) * length)
  }
}

export function addVector(point: Point2D, vector: Vector2D): Point2D {
  return {
    x: createAbsoluteOffset(point.x + vector.x),
    y: createAbsoluteOffset(point.y + vector.y)
  }
}

export function snapToGrid(point: Point2D, gridSize: Length): Point2D {
  return {
    x: createAbsoluteOffset(Math.round(point.x / gridSize) * gridSize),
    y: createAbsoluteOffset(Math.round(point.y / gridSize) * gridSize)
  }
}

export function expandBounds(bounds: Bounds2D, padding: Length): Bounds2D {
  return {
    minX: createAbsoluteOffset(bounds.minX - padding),
    minY: createAbsoluteOffset(bounds.minY - padding),
    maxX: createAbsoluteOffset(bounds.maxX + padding),
    maxY: createAbsoluteOffset(bounds.maxY + padding)
  }
}

export function pointInBounds(point: Point2D, bounds: Bounds2D): boolean {
  return point.x >= bounds.minX &&
         point.x <= bounds.maxX &&
         point.y >= bounds.minY &&
         point.y <= bounds.maxY
}

export function boundsFromPoints(points: Point2D[]): Bounds2D | null {
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

  return {
    minX: createAbsoluteOffset(minX),
    minY: createAbsoluteOffset(minY),
    maxX: createAbsoluteOffset(maxX),
    maxY: createAbsoluteOffset(maxY)
  }
}

export function isPointNearLine(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D,
  tolerance: Length = createLength(5)
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
      x: createAbsoluteOffset(lineStart.x + param * C),
      y: createAbsoluteOffset(lineStart.y + param * D)
    }
  }

  return distance(point, closestPoint) <= tolerance
}

export function offsetToPosition(startPoint: Point2D, endPoint: Point2D, offset: Length): Point2D {
  const dx = endPoint.x - startPoint.x
  const dy = endPoint.y - startPoint.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return startPoint

  const t = offset / length

  return {
    x: createAbsoluteOffset(startPoint.x + dx * t),
    y: createAbsoluteOffset(startPoint.y + dy * t)
  }
}

// Formatting utilities
export function formatLength(length: Length, unit: 'mm' | 'cm' | 'm' = 'm'): string {
  switch (unit) {
    case 'mm':
      return `${length.toFixed(0)}mm`
    case 'cm':
      return `${(length / 10).toFixed(1)}cm`
    case 'm':
      return `${(length / 1000).toFixed(2)}m`
    default:
      return `${length.toFixed(0)}`
  }
}

export function formatArea(area: Area, unit: 'mm²' | 'cm²' | 'm²' = 'm²'): string {
  switch (unit) {
    case 'mm²':
      return `${area.toFixed(0)}mm²`
    case 'cm²':
      return `${(area / 100).toFixed(1)}cm²`
    case 'm²':
      return `${(area / 1000000).toFixed(2)}m²`
    default:
      return `${area.toFixed(0)}`
  }
}

// Polygon utilities
export function calculatePolygonArea(polygon: Polygon2D): Area {
  const points = polygon.points
  if (points.length < 3) return createArea(0)

  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return createArea(Math.abs(area) / 2)
}

export function calculatePolygonWithHolesArea(polygon: PolygonWithHoles2D): Area {
  let totalArea = calculatePolygonArea(polygon.outer)
  
  for (const hole of polygon.holes) {
    totalArea = createArea(totalArea - calculatePolygonArea(hole))
  }
  
  return totalArea
}