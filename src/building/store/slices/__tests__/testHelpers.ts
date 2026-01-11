import { expect, vi } from 'vitest'

import type { WallPostParams } from '@/building/model'
import type { PerimeterId } from '@/building/model/ids'
import { createStoreyId, isOpeningId, isWallPostId } from '@/building/model/ids'
import { NotFoundError } from '@/building/store/errors'
import {
  type PerimetersSlice,
  type PerimetersState,
  createPerimetersSlice
} from '@/building/store/slices/perimeterSlice'
import type { MaterialId } from '@/construction/materials/material'
import type { Polygon2D } from '@/shared/geometry'
import { newVec2 } from '@/shared/geometry'

/**
 * Creates a simple rectangular boundary polygon
 */
export function createRectangularBoundary(width = 10000, height = 5000): Polygon2D {
  return {
    points: [newVec2(0, 0), newVec2(0, height), newVec2(width, height), newVec2(width, 0)]
  }
}

/**
 * Creates a triangular boundary polygon
 */
export function createTriangularBoundary(): Polygon2D {
  return {
    points: [newVec2(0, 0), newVec2(2500, 4000), newVec2(5000, 0)]
  }
}

/**
 * Creates an L-shaped boundary with reflex angles
 */
export function createLShapedBoundary(): Polygon2D {
  return {
    points: [
      newVec2(0, 0),
      newVec2(0, 10000),
      newVec2(5000, 10000),
      newVec2(5000, 5000),
      newVec2(10000, 5000),
      newVec2(10000, 0)
    ]
  }
}

/**
 * Sets up a test perimeter slice with mock zustand methods
 */
export function setupPerimeterSlice() {
  let slice: PerimetersSlice
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const testStoreyId = createStoreyId()

  const mockStore = {} as any

  slice = createPerimetersSlice(mockSet, mockGet, mockStore)

  // Mock the get function to return current state
  mockGet.mockImplementation(() => slice)

  // Mock the set function to actually update the slice
  mockSet.mockImplementation((updater: any) => {
    if (typeof updater === 'function') {
      const newState = updater(slice)
      if (newState !== slice) {
        slice = { ...slice, ...newState }
      }
    } else {
      slice = { ...slice, ...updater }
    }
  })

  return { slice, mockSet, mockGet, testStoreyId }
}

/**
 * Verifies that all references within a perimeter are consistent
 */
export function verifyPerimeterReferences(state: PerimetersState, perimeterId: PerimeterId): void {
  const perimeter = state.perimeters[perimeterId]
  expect(perimeter).toBeDefined()

  // Verify all walls exist and reference correct perimeter
  perimeter.wallIds.forEach(wallId => {
    const wall = state.perimeterWalls[wallId]
    expect(wall, `Wall ${wallId} should exist`).toBeDefined()
    expect(wall.perimeterId, `Wall ${wallId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    // Verify wall's corners exist
    expect(state.perimeterCorners[wall.startCornerId], `Start corner ${wall.startCornerId} should exist`).toBeDefined()
    expect(state.perimeterCorners[wall.endCornerId], `End corner ${wall.endCornerId} should exist`).toBeDefined()
  })

  // Verify all corners exist and reference correct perimeter
  perimeter.cornerIds.forEach(cornerId => {
    const corner = state.perimeterCorners[cornerId]
    expect(corner, `Corner ${cornerId} should exist`).toBeDefined()
    expect(corner.perimeterId, `Corner ${cornerId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    // Verify corner's walls exist
    expect(
      state.perimeterWalls[corner.previousWallId],
      `Previous wall ${corner.previousWallId} should exist`
    ).toBeDefined()
    expect(state.perimeterWalls[corner.nextWallId], `Next wall ${corner.nextWallId} should exist`).toBeDefined()
  })

  // Verify circular structure: wall.endCorner === next_wall.startCorner
  for (let i = 0; i < perimeter.wallIds.length; i++) {
    const wallId = perimeter.wallIds[i]
    const nextWallId = perimeter.wallIds[(i + 1) % perimeter.wallIds.length]
    const wall = state.perimeterWalls[wallId]
    const nextWall = state.perimeterWalls[nextWallId]

    expect(wall.endCornerId, `Wall ${wallId} end corner should match next wall ${nextWallId} start corner`).toBe(
      nextWall.startCornerId
    )
  }

  // Verify corner references match wall structure
  for (let i = 0; i < perimeter.cornerIds.length; i++) {
    const cornerId = perimeter.cornerIds[i]
    const corner = state.perimeterCorners[cornerId]
    const prevWallIndex = (i - 1 + perimeter.wallIds.length) % perimeter.wallIds.length
    const expectedPreviousWall = perimeter.wallIds[prevWallIndex]
    const expectedNextWall = perimeter.wallIds[i]

    expect(corner.previousWallId, `Corner ${cornerId} previous wall should be ${expectedPreviousWall}`).toBe(
      expectedPreviousWall
    )
    expect(corner.nextWallId, `Corner ${cornerId} next wall should be ${expectedNextWall}`).toBe(expectedNextWall)
  }
}

/**
 * Verifies that geometry exists for all entities in a perimeter
 */
export function verifyGeometryExists(state: PerimetersState, perimeterId: PerimeterId): void {
  const perimeter = state.perimeters[perimeterId]

  // Verify perimeter geometry
  expect(state._perimeterGeometry[perimeterId], `Perimeter ${perimeterId} geometry should exist`).toBeDefined()

  // Verify wall geometry
  perimeter.wallIds.forEach(wallId => {
    expect(state._perimeterWallGeometry[wallId], `Wall ${wallId} geometry should exist`).toBeDefined()
  })

  // Verify corner geometry
  perimeter.cornerIds.forEach(cornerId => {
    expect(state._perimeterCornerGeometry[cornerId], `Corner ${cornerId} geometry should exist`).toBeDefined()
  })
}

/**
 * Verifies that there are no orphaned entities or geometry in the state
 */
export function verifyNoOrphanedEntities(state: PerimetersState): void {
  const allPerimeterIds = new Set(Object.keys(state.perimeters))
  const allWallIds = new Set<string>()
  const allCornerIds = new Set<string>()
  const allOpeningIds = new Set<string>()
  const allPostIds = new Set<string>()

  // Collect all IDs that should exist
  Object.values(state.perimeters).forEach(perimeter => {
    perimeter.wallIds.forEach(id => allWallIds.add(id))
    perimeter.cornerIds.forEach(id => allCornerIds.add(id))
  })

  Object.values(state.perimeterWalls).forEach(wall => {
    wall.entityIds.forEach(id => {
      if (isOpeningId(id)) allOpeningIds.add(id)
      if (isWallPostId(id)) allPostIds.add(id)
    })
  })

  // Verify no orphaned walls
  Object.keys(state.perimeterWalls).forEach(wallId => {
    expect(allWallIds.has(wallId), `Wall ${wallId} should be referenced by a perimeter`).toBe(true)
  })

  // Verify no orphaned corners
  Object.keys(state.perimeterCorners).forEach(cornerId => {
    expect(allCornerIds.has(cornerId), `Corner ${cornerId} should be referenced by a perimeter`).toBe(true)
  })

  // Verify no orphaned openings
  Object.keys(state.openings).forEach(openingId => {
    expect(allOpeningIds.has(openingId), `Opening ${openingId} should be referenced by a wall`).toBe(true)
  })

  // Verify no orphaned posts
  Object.keys(state.wallPosts).forEach(postId => {
    expect(allPostIds.has(postId), `Post ${postId} should be referenced by a wall`).toBe(true)
  })

  // Verify no orphaned geometry
  Object.keys(state._perimeterGeometry).forEach(id => {
    expect(allPerimeterIds.has(id), `Perimeter geometry for ${id} should have corresponding perimeter`).toBe(true)
  })

  Object.keys(state._perimeterWallGeometry).forEach(id => {
    expect(allWallIds.has(id), `Wall geometry for ${id} should have corresponding wall`).toBe(true)
  })

  Object.keys(state._perimeterCornerGeometry).forEach(id => {
    expect(allCornerIds.has(id), `Corner geometry for ${id} should have corresponding corner`).toBe(true)
  })

  Object.keys(state._openingGeometry).forEach(id => {
    expect(allOpeningIds.has(id), `Opening geometry for ${id} should have corresponding opening`).toBe(true)
  })

  Object.keys(state._wallPostGeometry).forEach(id => {
    expect(allPostIds.has(id), `Post geometry for ${id} should have corresponding post`).toBe(true)
  })
}

/**
 * Verifies that a getter throws for an invalid ID
 */
export function expectThrowsForInvalidId(getter: () => unknown, expectedMessage?: string): void {
  expect(() => getter()).toThrow(NotFoundError)
  if (expectedMessage) {
    expect(() => getter()).toThrow(expectedMessage)
  }
}

export function mockPost(params: Partial<WallPostParams>): WallPostParams {
  return {
    centerOffsetFromWallStart: 0,
    postType: 'center',
    replacesPosts: true,
    thickness: 42,
    width: 23,
    material: 'postMaterial' as MaterialId,
    infillMaterial: 'infillMaterial' as MaterialId,
    ...params
  }
}
