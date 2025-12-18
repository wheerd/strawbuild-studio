import { type Length, type Line2D, type LineSegment2D, type Vec2 } from '@/shared/geometry'

export interface SnapResult {
  position: Vec2
  lines?: Line2D[] // Array of 1 or 2 lines to render (1 for line snap, 2 for intersection)
}

// Context for snapping operations
export interface SnappingContext {
  snapPoints: Vec2[]
  alignPoints?: Vec2[]
  referencePoint?: Vec2
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
  pointSnapDistance: 200, // 500mm
  lineSnapDistance: 100, // 100mm
  minDistance: 50 // 50mm
}
