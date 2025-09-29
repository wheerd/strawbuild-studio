import type { Bounds3D, Plane3D, Polygon2D } from '@/shared/geometry'

import type { GroupOrElement } from './elements'
import type { Transform } from './geometry'
import type { Measurement } from './measurements'
import type { ConstructionIssue } from './results'
import type { Tag } from './tags'

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: Measurement[]
  areas: HighlightedArea[]
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
  bounds: Bounds3D
}

export type HighlightedAreaType = 'inner-perimeter' | 'outer-perimeter' | 'corner' | 'window' | 'door' | 'passage'

export type HighlightedArea = HighlightedCuboid | HighlightedPolygon

/** Highlighted area for visual feedback (corners, critical zones, etc.) */
export interface HighlightedCuboid {
  type: 'cuboid'
  areaType: HighlightedAreaType
  label?: string
  transform: Transform
  bounds: Bounds3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}

export interface HighlightedPolygon {
  type: 'polygon'
  areaType: HighlightedAreaType
  label?: string
  polygon: Polygon2D
  plane: Plane3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}
