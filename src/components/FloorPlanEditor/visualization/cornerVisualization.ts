import type { Point2D, Line2D, Vector2D, Polygon2D } from '@/types/geometry'
import { createPoint2D, createVector2D, lineIntersection, projectPointOntoLine } from '@/types/geometry'
import type { Wall, Corner } from '@/types/model'

/**
 * Simple wall data needed for miter calculation
 */
interface WallData {
  thickness: number
  direction: Vector2D // Direction vector pointing away from corner
  leftBoundary: Line2D
  rightBoundary: Line2D
}

/**
 * Calculates proper miter joint polygon for architectural corners.
 */
export function calculateCornerMiterPolygon(
  corner: Corner,
  walls: Map<string, Wall>,
  points: Map<string, { position: Point2D }>
): Polygon2D | null {
  // Get the corner point position
  const cornerPointData = points.get(corner.pointId)
  if (!cornerPointData) return null
  const cornerPoint = cornerPointData.position

  // Get the two main walls
  const wall1 = walls.get(corner.wall1Id)
  const wall2 = walls.get(corner.wall2Id)
  if (!wall1 || !wall2) return null

  // Calculate simplified wall data
  const wall1Data = calculateWallData(wall1, points, cornerPoint)
  const wall2Data = calculateWallData(wall2, points, cornerPoint)
  if (!wall1Data || !wall2Data) return null

  // Check if walls are colinear (cross product ≈ 0)
  const cross =
    Number(wall1Data.direction.x) * Number(wall2Data.direction.y) -
    Number(wall1Data.direction.y) * Number(wall2Data.direction.x)
  const isColinear = Math.abs(cross) < 0.1 // Tolerance for nearly colinear

  let polygonPoints: Point2D[]

  if (isColinear) {
    polygonPoints = generateColinearMiterPolygon(wall1Data, wall2Data, cornerPoint)
  } else {
    polygonPoints = generateGenericMiterPolygon(wall1Data, wall2Data, cornerPoint)
  }

  if (polygonPoints.length < 3) return null

  return { points: polygonPoints }
}

/**
 * Calculate simplified wall data for miter calculation
 */
function calculateWallData(
  wall: Wall,
  points: Map<string, { position: Point2D }>,
  cornerPoint: Point2D
): WallData | null {
  const startPointData = points.get(wall.startPointId)
  const endPointData = points.get(wall.endPointId)
  if (!startPointData || !endPointData) return null

  const startPoint = startPointData.position
  const endPoint = endPointData.position

  // Determine which end is at the corner
  const distToStart = Math.abs(Number(startPoint.x - cornerPoint.x)) + Math.abs(Number(startPoint.y - cornerPoint.y))
  const distToEnd = Math.abs(Number(endPoint.x - cornerPoint.x)) + Math.abs(Number(endPoint.y - cornerPoint.y))
  const isStartAtCorner = distToStart < distToEnd

  // Calculate wall direction vector (pointing away from corner)
  const otherPoint = isStartAtCorner ? endPoint : startPoint
  const dx = Number(otherPoint.x) - Number(cornerPoint.x)
  const dy = Number(otherPoint.y) - Number(cornerPoint.y)
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return null

  const direction = createVector2D(dx / length, dy / length)
  const normal = createVector2D(-Number(direction.y), Number(direction.x)) // 90° counter-clockwise
  const halfThickness = wall.thickness / 2

  // Create boundary lines
  const leftBoundaryPoint = createPoint2D(
    Number(cornerPoint.x) + Number(normal.x) * halfThickness,
    Number(cornerPoint.y) + Number(normal.y) * halfThickness
  )
  const rightBoundaryPoint = createPoint2D(
    Number(cornerPoint.x) - Number(normal.x) * halfThickness,
    Number(cornerPoint.y) - Number(normal.y) * halfThickness
  )

  return {
    thickness: wall.thickness,
    direction,
    leftBoundary: { point: leftBoundaryPoint, direction },
    rightBoundary: { point: rightBoundaryPoint, direction }
  }
}

/**
 * Generate rectangular miter for colinear walls
 */
function generateColinearMiterPolygon(wall1Data: WallData, wall2Data: WallData, cornerPoint: Point2D): Point2D[] {
  const maxThickness = Math.max(wall1Data.thickness, wall2Data.thickness)
  const halfThickness = maxThickness / 2

  const direction = wall1Data.direction
  const normal = createVector2D(-Number(direction.y), Number(direction.x))

  // Create a rectangle centered on the corner point
  return [
    createPoint2D(
      Number(cornerPoint.x) + Number(normal.x) * halfThickness - Number(direction.x) * halfThickness,
      Number(cornerPoint.y) + Number(normal.y) * halfThickness - Number(direction.y) * halfThickness
    ),
    createPoint2D(
      Number(cornerPoint.x) + Number(normal.x) * halfThickness + Number(direction.x) * halfThickness,
      Number(cornerPoint.y) + Number(normal.y) * halfThickness + Number(direction.y) * halfThickness
    ),
    createPoint2D(
      Number(cornerPoint.x) - Number(normal.x) * halfThickness + Number(direction.x) * halfThickness,
      Number(cornerPoint.y) - Number(normal.y) * halfThickness + Number(direction.y) * halfThickness
    ),
    createPoint2D(
      Number(cornerPoint.x) - Number(normal.x) * halfThickness - Number(direction.x) * halfThickness,
      Number(cornerPoint.y) - Number(normal.y) * halfThickness - Number(direction.y) * halfThickness
    )
  ]
}

/**
 * Generic miter polygon for all non-colinear angles
 */
function generateGenericMiterPolygon(wall1Data: WallData, wall2Data: WallData, cornerPoint: Point2D): Point2D[] {
  // Determine inner and outer boundaries based on cross product
  const cross =
    Number(wall1Data.direction.x) * Number(wall2Data.direction.y) -
    Number(wall1Data.direction.y) * Number(wall2Data.direction.x)

  const [wall1Inner, wall1Outer, wall2Inner, wall2Outer] =
    cross > 0
      ? [wall1Data.rightBoundary, wall1Data.leftBoundary, wall2Data.leftBoundary, wall2Data.rightBoundary]
      : [wall1Data.leftBoundary, wall1Data.rightBoundary, wall2Data.rightBoundary, wall2Data.leftBoundary]

  // Calculate the 4 key points
  const innerIntersection = lineIntersection(wall1Inner, wall2Inner)
  const outerIntersection = lineIntersection(wall1Outer, wall2Outer)

  const points: Point2D[] = []

  if (innerIntersection) points.push(innerIntersection)
  if (outerIntersection) {
    points.push(outerIntersection)
    // Add projections of outer intersection onto inner boundaries
    const proj1 = projectPointOntoLine(outerIntersection, wall1Inner)
    const proj2 = projectPointOntoLine(outerIntersection, wall2Inner)
    if (proj1) points.push(proj1)
    if (proj2) points.push(proj2)
  }

  if (points.length >= 3) {
    return sortPointsClockwise(points, cornerPoint)
  }

  // Simple fallback shape
  const maxThickness = Math.max(wall1Data.thickness, wall2Data.thickness)
  const radius = maxThickness * 0.5
  return [
    createPoint2D(Number(cornerPoint.x) + radius, Number(cornerPoint.y)),
    createPoint2D(Number(cornerPoint.x), Number(cornerPoint.y) + radius),
    createPoint2D(Number(cornerPoint.x) - radius, Number(cornerPoint.y)),
    createPoint2D(Number(cornerPoint.x), Number(cornerPoint.y) - radius)
  ]
}

/**
 * Sort points in clockwise order around a center point
 */
function sortPointsClockwise(points: Point2D[], center: Point2D): Point2D[] {
  return points.sort((a, b) => {
    const angleA = Math.atan2(Number(a.y - center.y), Number(a.x - center.x))
    const angleB = Math.atan2(Number(b.y - center.y), Number(b.x - center.x))
    return angleA - angleB
  })
}
