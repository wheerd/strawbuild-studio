import { useMemo } from 'react'
import { Group } from 'react-konva/lib/ReactKonvaCore'

import type {
  FloorAreaId,
  FloorOpeningId,
  OpeningId,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  RoofId,
  SelectableId,
  WallPostId
} from '@/building/model/ids'
import {
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId,
  isWallPostId
} from '@/building/model/ids'
import type { Perimeter, Roof } from '@/building/model/model'
import { useFloorAreaById, useFloorOpeningById, usePerimeterById, useRoofById } from '@/building/store'
import { SelectionOutline } from '@/editor/canvas/utils/SelectionOutline'
import { useCurrentSelection, useSelectionPath } from '@/editor/hooks/useSelectionStore'
import { type Vec2, addVec2, direction, eqVec2, perpendicular, scaleAddVec2, scaleVec2 } from '@/shared/geometry'

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

/**
 * Custom hook to get selection outline points that properly handles reactive store data
 */
function useSelectionOutlinePoints(
  selectionPath: SelectableId[],
  currentSelection: SelectableId | null
): Vec2[] | null {
  const rootEntityId = selectionPath[0]

  // Always call the hook unconditionally - follows Rules of Hooks
  // We cast rootEntityId to PerimeterId and let the hook handle invalid IDs gracefully
  const perimeter = usePerimeterById(rootEntityId as PerimeterId)
  const floorArea = useFloorAreaById((currentSelection ?? '') as FloorAreaId)
  const floorOpening = useFloorOpeningById((currentSelection ?? '') as FloorOpeningId)
  const roof = useRoofById(rootEntityId as RoofId)

  return useMemo(() => {
    if (!selectionPath.length || !currentSelection) {
      return null
    }

    if (isFloorAreaId(currentSelection) && floorArea) {
      return floorArea.area.points
    }

    if (isFloorOpeningId(currentSelection) && floorOpening) {
      return floorOpening.area.points
    }

    if (isRoofId(rootEntityId) && roof) {
      return getRoofEntityPoints(roof, currentSelection)
    }

    if (isRoofId(rootEntityId) && !roof) {
      console.warn('SelectionOverlay: Roof not found:', rootEntityId)
      return null
    }

    if (isPerimeterId(rootEntityId) && perimeter) {
      return getPerimeterEntityPoints(perimeter, selectionPath, currentSelection)
    }

    if (isPerimeterId(rootEntityId) && !perimeter) {
      console.warn('SelectionOverlay: Perimeter not found:', rootEntityId)
      return null
    }

    // For non-perimeter root entities, perimeter will be null and we fall through
    // Future entity types will be added here:
    // if (isBuildingId(rootEntityId)) { ... }

    if (!isPerimeterId(rootEntityId)) {
      console.warn('SelectionOverlay: Unsupported root entity type:', rootEntityId)
    }
    return null
  }, [selectionPath, currentSelection, rootEntityId, perimeter, floorArea, floorOpening, roof])
}

export function SelectionOverlay(): React.JSX.Element | null {
  const selectionPath = useSelectionPath()
  const currentSelection = useCurrentSelection()

  const outlinePoints = useSelectionOutlinePoints(selectionPath, currentSelection)

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
 * Get outline points for entities within an OuterWall hierarchy
 */
function getPerimeterEntityPoints(
  perimeter: Perimeter,
  selectionPath: SelectableId[],
  currentSelection: SelectableId
): Vec2[] | null {
  // Entity type determines the selection path structure and required points
  if (isPerimeterId(currentSelection)) {
    // Path: [perimeterId]
    return getPerimeterPoints(perimeter)
  }

  if (isPerimeterWallId(currentSelection)) {
    // Path: [perimeterId, wallId]
    return getPerimeterWallPoints(perimeter, currentSelection)
  }

  if (isPerimeterCornerId(currentSelection)) {
    // Path: [perimeterId, cornerId]
    return getPerimeterCornerPoints(perimeter, currentSelection)
  }

  if (isOpeningId(currentSelection)) {
    // Path: [perimeterId, wallId, openingId]
    const [, wallId] = selectionPath
    if (isPerimeterWallId(wallId)) {
      return getOpeningPoints(perimeter, wallId, currentSelection)
    }
  }

  if (isWallPostId(currentSelection)) {
    // Path: [perimeterId, wallId, postId]
    const [, wallId] = selectionPath
    if (isPerimeterWallId(wallId)) {
      return getWallPostPoints(perimeter, wallId, currentSelection)
    }
  }

  return null
}

/**
 * Get outline points for entities within an OuterWall hierarchy
 */
function getRoofEntityPoints(roof: Roof, currentSelection: SelectableId): Vec2[] | null {
  // Entity type determines the selection path structure and required points
  if (isRoofId(currentSelection)) {
    // Path: [roofId]s
    return roof.overhangPolygon.points
  }

  if (isRoofOverhangId(currentSelection)) {
    // Path: [roofId, wallId]
    return roof.overhangs.find(o => o.id === currentSelection)?.area.points ?? null
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

  // Get adjacent walls
  const prevWallIndex = (cornerIndex - 1 + wall.walls.length) % wall.walls.length
  const nextWallIndex = cornerIndex
  const previousWall = wall.walls[prevWallIndex]
  const nextWall = wall.walls[nextWallIndex]

  // Check if corner is nearly straight (close to 180°) - same logic as PerimeterCornerShape
  const interiorAngleDegrees = corner.interiorAngle
  const exteriorAngleDegrees = corner.exteriorAngle
  const isNearStraight = Math.abs(interiorAngleDegrees - 180) <= 5 || Math.abs(exteriorAngleDegrees - 180) <= 5

  if (isNearStraight) {
    // For near-straight corners, use improved overlay shape (same as PerimeterCornerShape)
    const normal = perpendicular(direction(corner.insidePoint, corner.outsidePoint))
    const halfOverlayWidth = 80 / 2

    return [
      scaleAddVec2(corner.insidePoint, normal, -halfOverlayWidth),
      scaleAddVec2(corner.insidePoint, normal, halfOverlayWidth),
      scaleAddVec2(corner.outsidePoint, normal, halfOverlayWidth),
      scaleAddVec2(corner.outsidePoint, normal, -halfOverlayWidth)
    ]
  }

  // Create corner polygon (same logic as PerimeterCornerShape)
  return [
    corner.insidePoint,
    eqVec2(corner.insidePoint, previousWall.insideLine.end) ? null : previousWall.insideLine.end,
    eqVec2(corner.outsidePoint, previousWall.outsideLine.end) ? null : previousWall.outsideLine.end,
    corner.outsidePoint,
    eqVec2(corner.outsidePoint, nextWall.outsideLine.start) ? null : nextWall.outsideLine.start,
    eqVec2(corner.insidePoint, nextWall.insideLine.start) ? null : nextWall.insideLine.start
  ].filter(p => p !== null)
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
  const offsetDistance = opening.centerOffsetFromWallStart
  const halfWidth = opening.width / 2
  const offsetStart = scaleVec2(wallVector, offsetDistance - halfWidth)
  const offsetEnd = scaleVec2(wallVector, offsetDistance + halfWidth)

  // Calculate opening polygon corners
  const insideOpeningStart = addVec2(insideStart, offsetStart)
  const insideOpeningEnd = addVec2(insideStart, offsetEnd)
  const outsideOpeningStart = addVec2(outsideStart, offsetStart)
  const outsideOpeningEnd = addVec2(outsideStart, offsetEnd)

  return [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
}

function getWallPostPoints(perimeter: Perimeter, wallId: PerimeterWallId, postId: WallPostId): Vec2[] | null {
  const wall = perimeter.walls.find(s => s.id === wallId)

  if (!wall) {
    console.warn('SelectionOverlay: Wall not found for post:', wallId)
    return null
  }

  const post = wall.posts.find(o => o.id === postId)

  if (!post) {
    console.warn('SelectionOverlay: Post not found:', postId)
    return null
  }

  // Calculate opening geometry (same logic as OpeningShape.tsx lines 33-49)
  const insideStart = wall.insideLine.start
  const outsideStart = wall.outsideLine.start
  const wallVector = wall.direction
  const offsetDistance = post.centerOffsetFromWallStart
  const halfWidth = post.width / 2
  const offsetStart = scaleVec2(wallVector, offsetDistance - halfWidth)
  const offsetEnd = scaleVec2(wallVector, offsetDistance + halfWidth)

  // Calculate opening polygon corners
  const insideOpeningStart = addVec2(insideStart, offsetStart)
  const insideOpeningEnd = addVec2(insideStart, offsetEnd)
  const outsideOpeningStart = addVec2(outsideStart, offsetStart)
  const outsideOpeningEnd = addVec2(outsideStart, offsetEnd)

  return [insideOpeningStart, insideOpeningEnd, outsideOpeningEnd, outsideOpeningStart]
}
