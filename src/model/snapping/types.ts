import type { Point2D, Line2D, LineSegment2D, Length } from '@/types/geometry'
import type { PointId } from '@/types/ids'
import type { Point } from '@/types/model'

export interface SnapResult {
  position: Point2D
  pointId?: PointId // If snapping to an existing point
  lines?: Line2D[] // Array of 1 or 2 lines to render (1 for line snap, 2 for intersection)
}

// Context for snapping operations
export interface SnappingContext {
  points: Point[]
  referencePoint?: Point2D
  referencePointId?: PointId
  referenceLineSegments?: LineSegment2D[]
}

// Snapping configuration
export interface SnapConfig {
  pointSnapDistance: Length
  lineSnapDistance: Length
  minDistance: Length
}

// Default snapping configuration
export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  pointSnapDistance: 200 as Length, // 500mm
  lineSnapDistance: 100 as Length, // 100mm
  minDistance: 50 as Length // 50mm
}
