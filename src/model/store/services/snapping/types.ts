import type { Vec2, Line2D, LineWall2D, Length } from '@/types/geometry'

export interface SnapResult {
  position: Vec2
  lines?: Line2D[] // Array of 1 or 2 lines to render (1 for line snap, 2 for intersection)
}

// Context for snapping operations
export interface SnappingContext {
  snapPoints: Vec2[]
  alignPoints?: Vec2[]
  referencePoint?: Vec2
  referenceLineWalls?: LineWall2D[]
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
