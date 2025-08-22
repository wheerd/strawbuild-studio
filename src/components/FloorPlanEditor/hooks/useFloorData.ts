import { useMemo } from 'react'
import { useModelStore } from '@/model/store'
import { getPointsOnFloor, getWallsOnFloor, getRoomsOnFloor } from '@/model/operations'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import type { Point, Wall, Room } from '@/types/model'
import type { PointId } from '@/types/ids'

/**
 * Custom hook that provides memoized access to points on the active floor.
 * Only recalculates when the points map, floors map, or active floor changes.
 */
export function usePointsOfActiveFloor (): Point[] {
  const modelState = useModelStore()
  const activeFloorId = useActiveFloorId()

  return useMemo(() =>
    getPointsOnFloor(modelState, activeFloorId),
  [modelState.points, modelState.floors, activeFloorId]
  )
}

/**
 * Custom hook that provides memoized access to walls on the active floor.
 * Only recalculates when the walls map, floors map, or active floor changes.
 */
export function useWallsOfActiveFloor (): Wall[] {
  const modelState = useModelStore()
  const activeFloorId = useActiveFloorId()

  return useMemo(() =>
    getWallsOnFloor(modelState, activeFloorId),
  [modelState.walls, modelState.floors, activeFloorId]
  )
}

/**
 * Custom hook that provides memoized access to rooms on the active floor.
 * Only recalculates when the rooms map, floors map, or active floor changes.
 */
export function useRoomsOfActiveFloor (): Room[] {
  const modelState = useModelStore()
  const activeFloorId = useActiveFloorId()

  return useMemo(() =>
    getRoomsOnFloor(modelState, activeFloorId),
  [modelState.rooms, modelState.floors, activeFloorId]
  )
}

/**
 * Custom hook that provides memoized access to walls connected to a specific point.
 * Useful for generating reference line segments for snapping.
 */
export function useWallsConnectedToPoint (pointId?: PointId): Wall[] {
  const walls = useWallsOfActiveFloor()

  return useMemo(() => {
    if (pointId == null) return []

    return walls.filter(wall =>
      wall.startPointId === pointId || wall.endPointId === pointId
    )
  }, [walls, pointId])
}

/**
 * Combined hook that provides all commonly needed floor data in one object.
 * Useful when components need multiple types of floor data.
 */
export function useActiveFloorData (): { points: Point[], walls: Wall[], rooms: Room[] } {
  const points = usePointsOfActiveFloor()
  const walls = useWallsOfActiveFloor()
  const rooms = useRoomsOfActiveFloor()

  return useMemo(() => ({
    points,
    walls,
    rooms
  }), [points, walls, rooms])
}
