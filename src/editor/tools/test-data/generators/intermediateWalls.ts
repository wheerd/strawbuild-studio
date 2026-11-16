import { getModelActions } from '@/building/store'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'
import { getSelectionActions } from '@/editor/canvas/state/selectionStore'
import { newVec2 } from '@/shared/geometry'

import { createRectangularPerimeter } from './rectangular'

/**
 * Creates a rectangular perimeter with representative intermediate-wall
 * relationships for editor interaction tests.
 */
export function createIntermediateWallTestData(): void {
  createRectangularPerimeter()

  const modelActions = getModelActions()
  const storeyId = modelActions.getActiveStoreyId()
  const perimeter = modelActions.getPerimetersByStorey(storeyId).at(-1)
  if (!perimeter) return

  const wallThickness = 120
  const bottomWall = modelActions.getPerimeterWallById(perimeter.wallIds[0])
  const topWall = modelActions.getPerimeterWallById(perimeter.wallIds[2])

  // A wall connected to two outer walls.
  const outerStart = modelActions.addPerimeterWallNode(perimeter.id, bottomWall.id, bottomWall.wallLength / 2)
  const outerEnd = modelActions.addPerimeterWallNode(perimeter.id, topWall.id, topWall.wallLength / 2)
  modelActions.addIntermediateWall(
    perimeter.id,
    { nodeId: outerStart.id, axis: 'left' },
    { nodeId: outerEnd.id, axis: 'left' },
    wallThickness,
    DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
  )

  // A standalone wall whose endpoints are not attached to outer walls.
  const standaloneStart = modelActions.addInnerWallNode(perimeter.id, newVec2(-2200, -300))
  const standaloneEnd = modelActions.addInnerWallNode(perimeter.id, newVec2(-600, -300))
  modelActions.addIntermediateWall(
    perimeter.id,
    { nodeId: standaloneStart.id, axis: 'left' },
    { nodeId: standaloneEnd.id, axis: 'left' },
    wallThickness,
    DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
  )

  // A second wall shares a node with the standalone wall.
  const junctionEnd = modelActions.addInnerWallNode(perimeter.id, newVec2(-600, 1300))
  modelActions.addIntermediateWall(
    perimeter.id,
    { nodeId: standaloneEnd.id, axis: 'left' },
    { nodeId: junctionEnd.id, axis: 'left' },
    wallThickness,
    DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
  )

  getSelectionActions().replaceSelection([perimeter.id])
}
