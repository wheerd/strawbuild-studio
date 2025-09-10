import { Group } from 'react-konva'
import type { Vec2 } from '@/types/geometry'
import { add, scale } from '@/types/geometry'
import type { PerimeterWallId, PerimeterCornerId, OpeningId, SelectableId } from '@/types/ids'
import { isPerimeterId, isPerimeterWallId, isPerimeterCornerId, isOpeningId } from '@/types/ids'
import type { Perimeter } from '@/types/model'
import type { Store } from '@/model/store/types'
import { useModelStore } from '@/model/store'
import { useSelectionPath, useCurrentSelection } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { SelectionOutline } from '@/components/FloorPlanEditor/components/SelectionOutline'

/**
 * Selection Path Structure Documentation:
 *
 * The selection system uses a predictable hierarchical path structure:
 * - Perimeter:     [perimeterId]                          → ["perimeter_123"]
 * - PerimeterWall:   [perimeterId, wallId]               → ["perimeter_123", "outwall_456"]
 * - PerimeterCorner:   [perimeterId, cornerId]                → ["perimeter_123", "outcorner_789"]
 * - Opening:       [perimeterId, wallId, openingId]    → ["perimeter_123", "outwall_456", "opening_012"]
 *
 * Key Points:
 * - Path always starts with the root entity (currently Perimeter, future: Floor, Building, etc.)
 * - Sub-entities include their parent IDs in hierarchical order
 * - Entity type guards determine which geometry calculation to use
 */

export function SelectionOverlay(): React.JSX.Element | null {
  const selectionPath = useSelectionPath()
  const currentSelection = useCurrentSelection()
  const modelStore = useModelStore()

  // No selection, no overlay
  if (!selectionPath.length || !currentSelection) {
    return null
  }

  // Calculate selection outline points based on entity type
  const outlinePoints = getSelectionOutlinePoints(selectionPath, currentSelection, modelStore)

  if (!outlinePoints || outlinePoints.length === 0) {
    return null
  }

  return (
    <Group name="selection-overlay">
      <SelectionOutline points={outlinePoints} />
    </Group>
  )
}

/**
 * Get selection outline points based on entity type and selection path
 */
function getSelectionOutlinePoints(
  selectionPath: SelectableId[],
  currentSelection: SelectableId,
  modelStore: Store
): Vec2[] | null {
  // Currently only OuterWall entities are supported as root
  // Future: Add support for Floor, Building, etc. as root entities
  const rootEntityId = selectionPath[0]

  if (isPerimeterId(rootEntityId)) {
    const wall = modelStore.getPerimeterById(rootEntityId)
    if (!wall) {
      console.warn('SelectionOverlay: OuterWall not found:', rootEntityId)
      return null
    }
    return getPerimeterEntityPoints(wall, selectionPath, currentSelection)
  }

  // Future entity types will be added here:
  // if (isBuildingId(rootEntityId)) { ... }

  console.warn('SelectionOverlay: Unsupported root entity type:', rootEntityId)
  return null
}

/**
 * Get outline points for entities within an OuterWall hierarchy
 */
function getPerimeterEntityPoints(
  perimeter: Perimeter,
  selectionPath: SelectableId[],
  currentSelection: SelectableId
): Vec2[] | null {
  // Entity type determines the selection path structure and required points
  if (isPerimeterId(currentSelection)) {
    // Path: [wallId]
    return getPerimeterPoints(perimeter)
  }

  if (isPerimeterWallId(currentSelection)) {
    // Path: [wallId, wallId]
    return getPerimeterWallPoints(perimeter, currentSelection)
  }

  if (isPerimeterCornerId(currentSelection)) {
    // Path: [wallId, cornerId]
    return getPerimeterCornerPoints(perimeter, currentSelection)
  }

  if (isOpeningId(currentSelection)) {
    // Path: [wallId, wallId, openingId]
    const [, wallId] = selectionPath
    if (isPerimeterWallId(wallId)) {
      return getOpeningPoints(perimeter, wallId, currentSelection)
    }
  }

  return null
}

/**
 * Get selection outline points for an OuterWall
 * Uses the outer boundary polygon formed by corner outside points
 */
function getPerimeterPoints(perimeter: Perimeter): Vec2[] {
  return perimeter.corners.map(corner => corner.outsidePoint)
}

/**
 * Get selection outline points for a PerimeterWall
 * Creates a rectangular polygon around the wall using inside/outside lines
 */
function getPerimeterWallPoints(perimeter: Perimeter, wallId: PerimeterWallId): Vec2[] | null {
  const wall = perimeter.walls.find(s => s.id === wallId)

  if (!wall) {
    console.warn('SelectionOverlay: Wall not found:', wallId)
    return null
  }

  return [wall.insideLine.start, wall.insideLine.end, wall.outsideLine.end, wall.outsideLine.start]
}

/**
 * Get selection outline points for an PerimeterCorner
 * Creates a complex polygon using the same logic as PerimeterCornerShape
 */
function getPerimeterCornerPoints(wall: Perimeter, cornerId: PerimeterCornerId): Vec2[] | null {
  const cornerIndex = wall.corners.findIndex(c => c.id === cornerId)

  if (cornerIndex === -1) {
    console.warn('SelectionOverlay: Corner not found:', cornerId)
    return null
  }

  const corner = wall.corners[cornerIndex]
  const boundaryPoint = wall.boundary[cornerIndex]

  // Get adjacent walls
  const prevWallIndex = (cornerIndex - 1 + wall.walls.length) % wall.walls.length
  const nextWallIndex = cornerIndex
  const previousWall = wall.walls[prevWallIndex]
  const nextWall = wall.walls[nextWallIndex]

  // Create corner polygon (same logic as PerimeterCornerShape)
  return [
    boundaryPoint,
    previousWall.insideLine.end,
    previousWall.outsideLine.end,
    corner.outsidePoint,
    nextWall.outsideLine.start,
    nextWall.insideLine.start
  ]
}

/**
 * Get selection outline points for an Opening
 * Creates a rectangular polygon around the opening using the same calculation as OpeningShape
 */
function getOpeningPoints(perimeter: Perimeter, wallId: PerimeterWallId, openingId: OpeningId): Vec2[] | null {
  const wall = perimeter.walls.find(s => s.id === wallId)

  if (!wall) {
    console.warn('SelectionOverlay: Wall not found for opening:', wallId)
    return null
  }

  const opening = wall.openings.find(o => o.id === openingId)

  if (!opening) {
    console.warn('SelectionOverlay: Opening not found:', openingId)
    return null
  }

  // Calculate opening geometry (same logic as OpeningShape.tsx lines 33-49)
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction
  const offsetDistance = opening.offsetFromStart
  const offsetStart = scale(wallVector, offsetDistance)
  const offsetEnd = add(offsetStart, scale(wallVector, opening.width))

  // Calculate opening polygon corners
  const insideOpeningStart = add(insideStart, offsetStart)
  const insideOpeningEnd = add(insideStart, offsetEnd)
  const outsideOpeningStart = add(outsideStart, offsetStart)
  const outsideOpeningEnd = add(outsideStart, offsetEnd)

  return [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
}
