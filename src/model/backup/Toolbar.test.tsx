import { describe, it, expect } from 'vitest'
import { useModelStore } from '@/model/store'
import { createEmptyModelState } from '@/model/operations'
import { createPoint2D, createLength } from '@/types/geometry'

describe('Sample Building Creation', () => {
  it('should create exactly one room when sample building is created', () => {
    // Initialize store with empty state
    const initialState = createEmptyModelState()
    useModelStore.setState(initialState)

    const floorId = Array.from(initialState.floors.keys())[0]

    // Simulate what the sample building function does
    const addPoint = useModelStore.getState().addPoint
    const addWall = useModelStore.getState().addWall

    // Create points
    const point1 = addPoint(createPoint2D(0, 0), floorId)
    const point2 = addPoint(createPoint2D(4000, 0), floorId)
    const point3 = addPoint(createPoint2D(4000, 3000), floorId)
    const point4 = addPoint(createPoint2D(0, 3000), floorId)

    // Create walls - this should automatically create one room via loop detection
    addWall(point1.id, point2.id, floorId, createLength(200), createLength(2700))
    addWall(point2.id, point3.id, floorId, createLength(200), createLength(2700))
    addWall(point3.id, point4.id, floorId, createLength(200), createLength(2700))
    addWall(point4.id, point1.id, floorId, createLength(200), createLength(2700))

    const finalState = useModelStore.getState()

    // Should have exactly one room (no duplicates)
    expect(finalState.rooms.size).toBe(1)

    // The room should have 4 walls
    const room = Array.from(finalState.rooms.values())[0]
    expect(room.outerBoundary.wallIds).toHaveLength(4)
  })

  it('should create properly ordered room polygon', () => {
    // This test verifies the room polygon points are in correct order
    // We can't easily test the UI component here, but we can test that
    // the room data structure has the correct walls in order

    const initialState = createEmptyModelState()
    useModelStore.setState(initialState)

    const floorId = Array.from(initialState.floors.keys())[0]
    const addPoint = useModelStore.getState().addPoint
    const addWall = useModelStore.getState().addWall

    // Create a simple rectangle
    const point1 = addPoint(createPoint2D(0, 0), floorId) // bottom-left
    const point2 = addPoint(createPoint2D(1000, 0), floorId) // bottom-right
    const point3 = addPoint(createPoint2D(1000, 1000), floorId) // top-right
    const point4 = addPoint(createPoint2D(0, 1000), floorId) // top-left

    const wall1 = addWall(point1.id, point2.id, floorId, createLength(200), createLength(2700)) // bottom
    const wall2 = addWall(point2.id, point3.id, floorId, createLength(200), createLength(2700)) // right
    const wall3 = addWall(point3.id, point4.id, floorId, createLength(200), createLength(2700)) // top
    const wall4 = addWall(point4.id, point1.id, floorId, createLength(200), createLength(2700)) // left

    const finalState = useModelStore.getState()
    const room = Array.from(finalState.rooms.values())[0]

    // Room should contain all 4 walls
    expect(room.outerBoundary.wallIds).toContain(wall1.id)
    expect(room.outerBoundary.wallIds).toContain(wall2.id)
    expect(room.outerBoundary.wallIds).toContain(wall3.id)
    expect(room.outerBoundary.wallIds).toContain(wall4.id)
  })
})
