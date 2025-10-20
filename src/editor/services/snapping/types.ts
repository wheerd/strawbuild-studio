import { vec2 } from 'gl-matrix'

import type { Length, Line2D, LineSegment2D } from '@/shared/geometry'

export interface SnapResult {
  position: vec2
  lines?: Line2D[] // Array of 1 or 2 lines to render (1 for line snap, 2 for intersection)
}

// Context for snapping operations
export interface SnappingContext {
  snapPoints: vec2[]
  alignPoints?: vec2[]
  referencePoint?: vec2
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
