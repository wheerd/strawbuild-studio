import { Group } from 'react-konva'
import type { Vec2 } from '@/types/geometry'
import { add, scale } from '@/types/geometry'
import type { WallSegmentId, OuterCornerId, OpeningId, SelectableId } from '@/types/ids'
import { isOuterWallId, isWallSegmentId, isOuterCornerId, isOpeningId } from '@/types/ids'
import type { OuterWallPolygon } from '@/types/model'
import type { Store } from '@/model/store/types'
import { useModelStore } from '@/model/store'
import { useSelectionPath, useCurrentSelection } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { SelectionOutline } from '@/components/FloorPlanEditor/components/SelectionOutline'

/**
 * Selection Path Structure Documentation:
 *
 * The selection system uses a predictable hierarchical path structure:
 * - OuterWall:     [wallId]                           → ["outside_123"]
 * - WallSegment:   [wallId, segmentId]               → ["outside_123", "segment_456"]
 * - OuterCorner:   [wallId, cornerId]                → ["outside_123", "outcorner_789"]
 * - Opening:       [wallId, segmentId, openingId]    → ["outside_123", "segment_456", "opening_012"]
 *
 * Future entities will follow similar patterns:
 * - Floor:         [floorId]                          → ["floor_123"]
 * - Room:          [floorId, roomId]                  → ["floor_123", "room_456"]
 * - InnerWall:     [floorId, innerWallId]            → ["floor_123", "inner_789"]
 *
 * Key Points:
 * - Path always starts with the root entity (currently OuterWall, future: Floor, Building, etc.)
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

  if (isOuterWallId(rootEntityId)) {
    const wall = modelStore.getOuterWallById(rootEntityId)
    if (!wall) {
      console.warn('SelectionOverlay: OuterWall not found:', rootEntityId)
      return null
    }
    return getOuterWallEntityPoints(wall, selectionPath, currentSelection)
  }

  // Future entity types will be added here:
  // if (isFloorId(rootEntityId)) { ... }
  // if (isBuildingId(rootEntityId)) { ... }

  console.warn('SelectionOverlay: Unsupported root entity type:', rootEntityId)
  return null
}

/**
 * Get outline points for entities within an OuterWall hierarchy
 */
function getOuterWallEntityPoints(
  wall: OuterWallPolygon,
  selectionPath: SelectableId[],
  currentSelection: SelectableId
): Vec2[] | null {
  // Entity type determines the selection path structure and required points
  if (isOuterWallId(currentSelection)) {
    // Path: [wallId]
    return getOuterWallPoints(wall)
  }

  if (isWallSegmentId(currentSelection)) {
    // Path: [wallId, segmentId]
    return getWallSegmentPoints(wall, currentSelection)
  }

  if (isOuterCornerId(currentSelection)) {
    // Path: [wallId, cornerId]
    return getOuterCornerPoints(wall, currentSelection)
  }

  if (isOpeningId(currentSelection)) {
    // Path: [wallId, segmentId, openingId]
    const [, segmentId] = selectionPath
    if (isWallSegmentId(segmentId)) {
      return getOpeningPoints(wall, segmentId, currentSelection)
    }
  }

  return null
}

/**
 * Get selection outline points for an OuterWall
 * Uses the outer boundary polygon formed by corner outside points
 */
function getOuterWallPoints(wall: OuterWallPolygon): Vec2[] {
  return wall.corners.map(corner => corner.outsidePoint)
}

/**
 * Get selection outline points for a WallSegment
 * Creates a rectangular polygon around the segment using inside/outside lines
 */
function getWallSegmentPoints(wall: OuterWallPolygon, segmentId: WallSegmentId): Vec2[] | null {
  const segment = wall.segments.find(s => s.id === segmentId)

  if (!segment) {
    console.warn('SelectionOverlay: Segment not found:', segmentId)
    return null
  }

  return [segment.insideLine.start, segment.insideLine.end, segment.outsideLine.end, segment.outsideLine.start]
}

/**
 * Get selection outline points for an OuterCorner
 * Creates a complex polygon using the same logic as OuterCornerShape
 */
function getOuterCornerPoints(wall: OuterWallPolygon, cornerId: OuterCornerId): Vec2[] | null {
  const cornerIndex = wall.corners.findIndex(c => c.id === cornerId)

  if (cornerIndex === -1) {
    console.warn('SelectionOverlay: Corner not found:', cornerId)
    return null
  }

  const corner = wall.corners[cornerIndex]
  const boundaryPoint = wall.boundary[cornerIndex]

  // Get adjacent segments
  const prevSegmentIndex = (cornerIndex - 1 + wall.segments.length) % wall.segments.length
  const nextSegmentIndex = cornerIndex
  const previousSegment = wall.segments[prevSegmentIndex]
  const nextSegment = wall.segments[nextSegmentIndex]

  // Create corner polygon (same logic as OuterCornerShape)
  return [
    boundaryPoint,
    previousSegment.insideLine.end,
    previousSegment.outsideLine.end,
    corner.outsidePoint,
    nextSegment.outsideLine.start,
    nextSegment.insideLine.start
  ]
}

/**
 * Get selection outline points for an Opening
 * Creates a rectangular polygon around the opening using the same calculation as OpeningShape
 */
function getOpeningPoints(wall: OuterWallPolygon, segmentId: WallSegmentId, openingId: OpeningId): Vec2[] | null {
  const segment = wall.segments.find(s => s.id === segmentId)

  if (!segment) {
    console.warn('SelectionOverlay: Segment not found for opening:', segmentId)
    return null
  }

  const opening = segment.openings.find(o => o.id === openingId)

  if (!opening) {
    console.warn('SelectionOverlay: Opening not found:', openingId)
    return null
  }

  // Calculate opening geometry (same logic as OpeningShape.tsx lines 33-49)
  const insideStart = segment.insideLine.start
  const outsideStart = segment.outsideLine.start
  const segmentVector = segment.direction
  const offsetDistance = opening.offsetFromStart
  const offsetStart = scale(segmentVector, offsetDistance)
  const offsetEnd = add(offsetStart, scale(segmentVector, opening.width))

  // Calculate opening polygon corners
  const insideOpeningStart = add(insideStart, offsetStart)
  const insideOpeningEnd = add(insideStart, offsetEnd)
  const outsideOpeningStart = add(outsideStart, offsetStart)
  const outsideOpeningEnd = add(outsideStart, offsetEnd)

  return [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
}
