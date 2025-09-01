import type { StateCreator } from 'zustand'
import type { PointId, WallId, FloorId } from '@/types/ids'
import type { WallsSlice } from './wallsSlice'
import type { PointsSlice } from './pointsSlice'
import type { Wall } from '@/types/model'
import {
  createPoint2D,
  distance,
  distanceToLineSegment,
  type Length,
  type Point2D,
  type LineSegment2D
} from '@/types/geometry'

export interface WallsPointsActions {
  getWallLength: (wallId: WallId) => Length
  mergePoints: (sourcePointId: PointId, targetPointId: PointId) => void
  moveWall: (wallId: WallId, deltaX: Length, deltaY: Length) => void
  getWallAtPoint: (point: Point2D, floorId: FloorId) => Wall | null
}

export type WallsPointsSlice = WallsPointsActions

export const createWallsPointsSlice: StateCreator<WallsSlice & PointsSlice, [], [], WallsPointsSlice> = (set, get) => ({
  getWallLength: (wallId: WallId): Length => {
    const state = get()
    const wall = state.getWallById(wallId)
    if (wall == null) return 0 as Length

    const startPoint = state.getPointById(wall.startPointId)
    const endPoint = state.getPointById(wall.endPointId)
    if (startPoint == null || endPoint == null) return 0 as Length

    return distance(startPoint.position, endPoint.position)
  },

  // Merge two points, updating all walls that reference the source point
  mergePoints: (sourcePointId: PointId, targetPointId: PointId) => {
    const state = get()
    const sourcePoint = state.getPointById(sourcePointId)
    const targetPoint = state.getPointById(targetPointId)

    if (sourcePoint == null || targetPoint == null) return
    if (sourcePointId === targetPointId) return

    if (sourcePoint.floorId !== targetPoint.floorId) {
      throw new Error('Cannot merge points on different floors')
    }

    // Find all walls connected to the source point
    const connectedWalls = state.getWallsConnectedToPoint(sourcePointId, sourcePoint.floorId)

    // Track walls to remove (degenerate and duplicates)
    const wallsToRemove: Set<WallId> = new Set()

    // Update each wall to reference the target point instead
    for (const wall of connectedWalls) {
      const updatedWall = { ...wall }

      if (wall.startPointId === sourcePointId) {
        updatedWall.startPointId = targetPointId
      }
      if (wall.endPointId === sourcePointId) {
        updatedWall.endPointId = targetPointId
      }

      // Check for degenerate wall (same start and end point)
      if (updatedWall.startPointId === updatedWall.endPointId) {
        wallsToRemove.add(wall.id)
        continue
      }

      // Check for duplicate walls
      const existingWalls = state.getWalls()
      for (const existingWall of existingWalls) {
        if (existingWall.id === wall.id) continue // Skip the current wall

        // Check if this wall duplicates an existing wall (same endpoints in either direction)
        const sameDirection =
          updatedWall.startPointId === existingWall.startPointId && updatedWall.endPointId === existingWall.endPointId
        const reverseDirection =
          updatedWall.startPointId === existingWall.endPointId && updatedWall.endPointId === existingWall.startPointId

        if (sameDirection || reverseDirection) {
          wallsToRemove.add(wall.id)
          break
        }
      }

      // Update the wall if it's not being removed
      if (!wallsToRemove.has(wall.id)) {
        set(state => {
          const newWalls = new Map(state.walls)
          newWalls.set(wall.id, updatedWall)
          return { walls: newWalls }
        })
      }
    }

    // Remove degenerate and duplicate walls
    for (const wallId of wallsToRemove) {
      state.removeWall(wallId)
    }

    // Transfer room associations from source to target
    for (const roomId of sourcePoint.roomIds) {
      state.addRoomToPoint(targetPointId, roomId)
    }

    // Remove the source point
    state.removePoint(sourcePointId)
  },

  moveWall(wallId: WallId, deltaX: Length, deltaY: Length): void {
    const state = get()
    const wall = state.walls.get(wallId)
    if (wall == null) return

    const startPoint = state.points.get(wall.startPointId)
    const endPoint = state.points.get(wall.endPointId)
    if (startPoint == null || endPoint == null) return

    // Calculate wall direction vector
    const wallDx = endPoint.position[0] - startPoint.position[0]
    const wallDy = endPoint.position[1] - startPoint.position[1]
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

    if (wallLength === 0) return // Degenerate wall

    // Calculate perpendicular (normal) vector to the wall
    const normalX = -wallDy / wallLength
    const normalY = wallDx / wallLength

    // Project the drag delta onto the perpendicular direction
    const projectedDistance = deltaX * normalX + deltaY * normalY

    // Apply movement only in the perpendicular direction
    const moveX = projectedDistance * normalX
    const moveY = projectedDistance * normalY

    const updatedState = { ...state }
    updatedState.points = new Map(state.points)
    updatedState.walls = new Map(state.walls)

    const newStartPosition: Point2D = createPoint2D(startPoint.position[0] + moveX, startPoint.position[1] + moveY)

    const newEndPosition: Point2D = createPoint2D(endPoint.position[0] + moveX, endPoint.position[1] + moveY)

    const updatedStartPoint = { ...startPoint, position: newStartPosition }
    const updatedEndPoint = { ...endPoint, position: newEndPosition }

    updatedState.points.set(wall.startPointId, updatedStartPoint)
    updatedState.points.set(wall.endPointId, updatedEndPoint)

    set(updatedState)
  },

  getWallAtPoint: (point: Point2D, floorId: FloorId): Wall | null => {
    const state = get()
    const wallsOnFloor = state.getWallsByFloor(floorId)

    for (const wall of wallsOnFloor) {
      const startPoint = state.getPointById(wall.startPointId)
      const endPoint = state.getPointById(wall.endPointId)

      if (!startPoint || !endPoint) continue

      const centerLine: LineSegment2D = {
        start: startPoint.position,
        end: endPoint.position
      }

      const distanceFromCenterLine = distanceToLineSegment(point, centerLine)
      if (distanceFromCenterLine <= wall.thickness / 2) {
        return wall
      }
    }

    return null
  }
})
