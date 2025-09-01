import type { StateCreator } from 'zustand'
import type { Point } from '@/types/model'
import type { PointId, RoomId, FloorId } from '@/types/ids'
import { createPointId } from '@/types/ids'
import type { Vec2, Length, Bounds2D } from '@/types/geometry'
import { boundsFromPoints, distanceSquared } from '@/types/geometry'

export interface PointsState {
  points: Map<PointId, Point>
}

export interface PointsActions {
  // CRUD operations - Enhanced with floorId
  addPoint: (floorId: FloorId, position: Vec2) => Point
  removePoint: (pointId: PointId) => void

  // Point modifications
  movePoint: (pointId: PointId, position: Vec2) => void

  // Point queries
  getPointById: (pointId: PointId) => Point | null
  findNearestPoint: (floorId: FloorId, target: Vec2, maxDistance?: Length, exludedPointId?: PointId) => Point | null
  getPoints: () => Point[]

  // NEW: Floor filtering methods
  getPointsByFloor: (floorId: FloorId) => Point[]

  // Floor entity management
  addRoomToPoint: (pointId: PointId, roomId: RoomId) => void
  removeRoomFromPoint: (pointId: PointId, roomId: RoomId) => void

  getFloorBounds: (floorId: FloorId) => Bounds2D | null
}

export type PointsSlice = PointsState & PointsActions

export const createPointsSlice: StateCreator<PointsSlice, [['zustand/devtools', never]], [], PointsSlice> = (
  set,
  get
) => ({
  points: new Map<PointId, Point>(),

  // CRUD operations
  addPoint: (floorId: FloorId, position: Vec2) => {
    const point: Point = {
      id: createPointId(),
      floorId,
      position,
      roomIds: new Set<RoomId>()
    }

    set(state => ({
      ...state,
      points: new Map(state.points).set(point.id, point)
    }))

    return point
  },

  removePoint: (pointId: PointId) => {
    set(state => {
      const newPoints = new Map(state.points)
      newPoints.delete(pointId)
      return {
        ...state,
        points: newPoints
      }
    })
  },

  // Point modifications
  movePoint: (pointId: PointId, position: Vec2) => {
    set(state => {
      const point = state.points.get(pointId)
      if (point == null) return state

      const updatedPoint: Point = {
        ...point,
        position
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  },

  // Point queries
  getPointById: (pointId: PointId) => {
    const state = get()
    return state.points.get(pointId) ?? null
  },

  findNearestPoint: (floorId: FloorId, target: Vec2, maxDistance?: Length, exludedPointId?: PointId) => {
    const state = get()

    let nearestPoint: Point | null = null
    let minDistanceSquared = maxDistance !== undefined ? maxDistance * maxDistance : Infinity

    for (const point of state.points.values()) {
      // Filter by floor
      if (point.floorId !== floorId) {
        continue
      }

      // Exclude specified point
      if (point.id === exludedPointId) {
        continue
      }

      const distSquared = distanceSquared(point.position, target)

      // Update nearest if this is closer
      if (distSquared < minDistanceSquared) {
        minDistanceSquared = distSquared
        nearestPoint = point
      }
    }

    return nearestPoint
  },

  getPoints: () => {
    const state = get()
    return Array.from(state.points.values())
  },

  getPointsByFloor: (floorId: FloorId) => {
    const state = get()
    return Array.from(state.points.values()).filter(point => point.floorId === floorId)
  },

  // Floor entity management
  addRoomToPoint: (pointId: PointId, roomId: RoomId) => {
    set(state => {
      const point = state.points.get(pointId)
      if (point == null) return state

      // Don't add if already present
      if (point.roomIds.has(roomId)) return state

      const updatedPoint: Point = {
        ...point,
        roomIds: new Set(point.roomIds).add(roomId)
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  },

  removeRoomFromPoint: (pointId: PointId, roomId: RoomId) => {
    set(state => {
      const point = state.points.get(pointId)
      if (point == null) return state

      const newRoomIds = new Set(point.roomIds)
      newRoomIds.delete(roomId)

      const updatedPoint: Point = {
        ...point,
        roomIds: newRoomIds
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  },

  getFloorBounds: (floorId: FloorId): Bounds2D | null => {
    const pointsOnFloor = get()
      .getPointsByFloor(floorId)
      .map(p => p.position)
    return boundsFromPoints(pointsOnFloor)
  }
})
