import { useMemo } from 'react'
import { usePoints } from '@/model/store'
import { usePointsOfActiveFloor, useWallsOfActiveFloor } from './useFloorData'
import type { LineSegment2D } from '@/types/geometry'
import type { SnappingContext } from '@/model/store/services/snapping/types'
import { useCurrentSnapFromPoint, useCurrentSnapFromPointId } from './useEditorStore'

/**
 * Custom hook that provides a memoized snapping context for the active floor.
 * The context is cached based on points, walls, and the reference point.
 * This prevents expensive recalculations on every mouse move.
 *
 * @param referencePoint - The point from which snapping is calculated (e.g., wall drawing start)
 * @param referencePointId - Optional ID of the reference point if it's an existing point (avoids expensive lookup)
 * @returns Memoized SnappingContext object
 */
export function useSnappingContext (): SnappingContext {
  const pointMap = usePoints()
  const referencePoint = useCurrentSnapFromPoint()
  const referencePointId = useCurrentSnapFromPointId()
  const points = usePointsOfActiveFloor()
  const walls = useWallsOfActiveFloor()

  return useMemo((): SnappingContext => {
    // Build reference line segments from walls connected to the reference point
    const referenceLineSegments: LineSegment2D[] | undefined = (referencePointId != null)
      ? walls
        .filter(wall => wall.startPointId === referencePointId || wall.endPointId === referencePointId)
        .map(wall => {
          const startPoint = pointMap.get(wall.startPointId)
          const endPoint = pointMap.get(wall.endPointId)
          if ((startPoint != null) && (endPoint != null)) {
            if (startPoint.id === referencePointId) {
              return { start: startPoint.position, end: endPoint.position }
            } else {
              return { start: endPoint.position, end: startPoint.position }
            }
          }
          return null
        })
        .filter((seg): seg is LineSegment2D => seg !== null)
      : undefined

    return {
      points,
      referencePoint,
      referencePointId,
      referenceLineSegments
    }
  }, [
    pointMap,
    points,
    walls,
    referencePoint?.x,
    referencePoint?.y,
    referencePointId
  ])
}
