import { dotAbsVec2 } from '@/shared/geometry'

import type { IntermediateWallId } from './ids'
import type { InnerWallNodeWithGeometry } from './rooms'

const COLINEAR_DOT_THRESHOLD = 0.9999

export interface InnerWallConstructionOption {
  constructedBy: IntermediateWallId
  constructedWithColinear?: IntermediateWallId
}

/** Returns the construction choices in their clockwise visual order. */
export function getInnerWallConstructionOptions(node: InnerWallNodeWithGeometry): InnerWallConstructionOption[] {
  const options: InnerWallConstructionOption[] = []

  for (let i = 0; i < node.incidentWalls.length; i++) {
    const incident = node.incidentWalls[i]
    const wallId = incident.id as IntermediateWallId
    options.push({ constructedBy: wallId })

    for (let j = i + 1; j < node.incidentWalls.length; j++) {
      const other = node.incidentWalls[j]
      const dot = dotAbsVec2(incident.direction, other.direction)
      if (dot >= COLINEAR_DOT_THRESHOLD) {
        options.push({ constructedBy: wallId, constructedWithColinear: other.id as IntermediateWallId })
      }
    }
  }

  return options
}

export function isInnerWallConstructionOption(
  option: Partial<InnerWallConstructionOption>,
  options: readonly InnerWallConstructionOption[]
): boolean {
  return options.some(
    candidate =>
      candidate.constructedBy === option.constructedBy &&
      candidate.constructedWithColinear === option.constructedWithColinear
  )
}
