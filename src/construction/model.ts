import type { Bounds3D, Vec3 } from '@/shared/geometry'

import type { GroupOrElement } from './elements'
import type { Measurement } from './measurements'
import type { ConstructionIssue } from './results'
import type { Transform } from './shapes'
import type { Tag } from './tags'

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: Measurement[]
  areas: HighlightedArea[]
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
  bounds: Bounds3D
}

/** Highlighted area for visual feedback (corners, critical zones, etc.) */
export interface HighlightedArea {
  label: string
  transform: Transform
  size: Vec3
  tags?: Tag[]
}
