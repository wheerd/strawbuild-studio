import type { PerimeterCornerGeometry, PerimeterCornerWithGeometry, RoofOverhang } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterCornerId, isRoofOverhangId } from '@/building/model/ids'
import { useModelEntityById } from '@/building/store'
import { SelectionOutline } from '@/editor/canvas/utils/SelectionOutline'
import { useCurrentSelection } from '@/editor/hooks/useSelectionStore'
import { type Vec2, direction, perpendicular, scaleAddVec2 } from '@/shared/geometry'

function useSelectionOutlinePoints(currentSelection: SelectableId | null): Vec2[] | null {
  const entity = useModelEntityById(currentSelection)
  if (!entity || !currentSelection) return null

  // Handle special case for perimeter corners
  if (isPerimeterCornerId(currentSelection)) {
    return getPerimeterCornerPoints(entity as PerimeterCornerWithGeometry)
  }

  // Handle roof overhang
  if (isRoofOverhangId(currentSelection)) {
    return (entity as RoofOverhang).area.points
  }

  // Handle all other entities with polygon or area properties
  if ('outerPolygon' in entity) return entity.outerPolygon.points
  if ('polygon' in entity) return entity.polygon.points
  if ('area' in entity) return entity.area.points
  if ('overhangPolygon' in entity) return entity.overhangPolygon.points

  return null
}

export function SelectionOverlay(): React.JSX.Element | null {
  const currentSelection = useCurrentSelection()
  const outlinePoints = useSelectionOutlinePoints(currentSelection)

  if (!outlinePoints || outlinePoints.length === 0) {
    return null
  }

  return (
    <g data-layer="selection-overlay">
      <SelectionOutline points={outlinePoints} />
    </g>
  )
}

function getPerimeterCornerPoints(corner: PerimeterCornerGeometry): Vec2[] {
  const isNearStraight = Math.abs(corner.interiorAngle - 180) <= 5
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

  return corner.polygon.points
}
