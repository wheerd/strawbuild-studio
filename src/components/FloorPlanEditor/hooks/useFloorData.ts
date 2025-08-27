import { useFloorPoints, useFloorRooms, useFloorWalls, useModelStore } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { Point, Wall, Room } from '@/types/model'
import type { PointId } from '@/types/ids'

/**
 * Custom hook that provides memoized access to points on the active floor.
 * Only recalculates when the points map, floors map, or active floor changes.
 */
export function usePointsOfActiveFloor (): Point[] {
  const activeFloorId = useActiveFloorId()
  return useFloorPoints(activeFloorId)
}

/**
 * Custom hook that provides memoized access to walls on the active floor.
 * Only recalculates when the walls map, floors map, or active floor changes.
 */
export function useWallsOfActiveFloor (): Wall[] {
  const activeFloorId = useActiveFloorId()
  return useFloorWalls(activeFloorId)
}

/**
 * Custom hook that provides memoized access to rooms on the active floor.
 * Only recalculates when the rooms map, floors map, or active floor changes.
 */
export function useRoomsOfActiveFloor (): Room[] {
  const activeFloorId = useActiveFloorId()
  return useFloorRooms()(activeFloorId)
}

/**
 * Custom hook that provides memoized access to walls connected to a specific point.
 * Useful for generating reference line segments for snapping.
 */
export function useWallsConnectedToPoint (pointId: PointId): Wall[] {
  return useModelStore(state => state.getWallsConnectedToPoint(pointId))
}
