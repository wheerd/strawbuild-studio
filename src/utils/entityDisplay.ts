import type { SelectableId } from '@/types/ids'
import { isPerimeterId, isWallSegmentId, isOuterCornerId, isOpeningId } from '@/types/ids'
import type { Perimeter } from '@/types/model'
import type { Store } from '@/model/store/types'

/**
 * Get display name for the currently selected entity
 * Uses the same selection path structure as SelectionOverlay
 */
export function getEntityDisplayName(
  selectionPath: SelectableId[],
  currentSelection: SelectableId | null,
  modelStore: Store
): string {
  if (!currentSelection || !selectionPath.length) {
    return 'Selection' // Disabled tab case
  }

  // Use the same pattern as SelectionOverlay
  const rootEntityId = selectionPath[0]

  if (isPerimeterId(rootEntityId)) {
    const wall = modelStore.getPerimeterById(rootEntityId)
    if (!wall) return 'Selection'

    return getOuterWallEntityName(wall, selectionPath, currentSelection)
  }

  // Future: Add support for other root entity types
  // if (isFloorId(rootEntityId)) { ... }

  return 'Selection'
}

/**
 * Get display name for entities within an OuterWall hierarchy
 * Follows the same structure as SelectionOverlay.getOuterWallEntityPoints
 */
function getOuterWallEntityName(
  wall: Perimeter,
  selectionPath: SelectableId[],
  currentSelection: SelectableId
): string {
  if (isPerimeterId(currentSelection)) {
    // Path: [wallId]
    return 'Outer Wall'
  }

  if (isWallSegmentId(currentSelection)) {
    // Path: [wallId, segmentId]
    const segment = wall.segments.find(s => s.id === currentSelection)
    if (!segment) return 'Wall Segment'

    // Return specific construction type name
    switch (segment.constructionType) {
      case 'cells-under-tension':
        return 'CUT Wall'
      case 'infill':
        return 'Infill Wall'
      case 'strawhenge':
        return 'Strawhenge Wall'
      case 'non-strawbale':
        return 'Non-Strawbale Wall'
      default:
        return 'Wall Segment'
    }
  }

  if (isOuterCornerId(currentSelection)) {
    // Path: [wallId, cornerId]
    return 'Corner'
  }

  if (isOpeningId(currentSelection)) {
    // Path: [wallId, segmentId, openingId]
    const [, segmentId] = selectionPath
    if (isWallSegmentId(segmentId)) {
      const segment = wall.segments.find(s => s.id === segmentId)
      if (!segment) return 'Opening'

      const opening = segment.openings.find(o => o.id === currentSelection)
      if (!opening) return 'Opening'

      // Return specific opening type name
      switch (opening.type) {
        case 'door':
          return 'Door'
        case 'window':
          return 'Window'
        case 'passage':
          return 'Passage'
        default:
          return 'Opening'
      }
    }
  }

  return 'Selection'
}
