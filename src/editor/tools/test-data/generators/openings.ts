import type { Perimeter } from '@/building/model'
import { getModelActions } from '@/building/store'
import { createLength } from '@/shared/geometry'

export interface WindowSpec {
  wallIndex: number
  offset: number // percentage along wall (0-1)
  width: number // mm
  height: number // mm
  sillHeight?: number // mm
  type?: string // for logging/debugging
}

export interface DoorSpec {
  wallIndex: number
  offset: number // percentage along wall (0-1)
  width: number // mm
  height: number // mm
  type?: string // for logging/debugging
}

/**
 * Add windows to a perimeter based on window specifications
 */
export function addWindows(perimeter: Perimeter, windowSpecs: WindowSpec[]): void {
  const modelStore = getModelActions()
  const walls = perimeter.walls

  windowSpecs.forEach((windowSpec, index) => {
    if (walls.length > windowSpec.wallIndex) {
      const wall = walls[windowSpec.wallIndex]
      const wallLength = wall.wallLength
      const windowWidth = windowSpec.width
      const offset = Math.floor(wallLength * windowSpec.offset)

      // Check if there's enough space for the window
      const marginNeeded = windowWidth < 800 ? 600 : 800
      if (wallLength > windowWidth + marginNeeded && offset + windowWidth <= wallLength - 200) {
        try {
          modelStore.addPerimeterWallOpening(perimeter.id, wall.id, {
            type: 'window',
            offsetFromStart: createLength(offset),
            width: createLength(windowWidth),
            height: createLength(windowSpec.height),
            sillHeight: createLength(windowSpec.sillHeight || (windowSpec.height < 900 ? 1000 : 900))
          })
        } catch (error) {
          console.warn(`Window ${index} (${windowSpec.type}) on wall ${windowSpec.wallIndex} failed:`, error)
        }
      }
    }
  })
}

/**
 * Add doors to a perimeter based on door specifications
 */
export function addDoors(perimeter: Perimeter, doorSpecs: DoorSpec[]): void {
  const modelStore = getModelActions()
  const walls = perimeter.walls

  doorSpecs.forEach((doorSpec, index) => {
    if (walls.length > doorSpec.wallIndex) {
      const wall = walls[doorSpec.wallIndex]
      const wallLength = wall.wallLength
      const doorWidth = doorSpec.width
      const offset = Math.floor(wallLength * doorSpec.offset)

      // Check if there's enough space for the door
      const marginNeeded = 800
      if (wallLength > doorWidth + marginNeeded && offset + doorWidth <= wallLength - 200) {
        try {
          modelStore.addPerimeterWallOpening(perimeter.id, wall.id, {
            type: 'door',
            offsetFromStart: createLength(offset),
            width: createLength(doorWidth),
            height: createLength(doorSpec.height)
          })
        } catch (error) {
          console.warn(`Door ${index} (${doorSpec.type}) on wall ${doorSpec.wallIndex} failed:`, error)
        }
      }
    }
  })
}

/**
 * Common window configurations for different building types
 */
export const CommonWindows = {
  small: { width: 600, height: 800, sillHeight: 1000 },
  medium: { width: 1000, height: 1000, sillHeight: 900 },
  large: { width: 1600, height: 1400, sillHeight: 900 },
  pairedSmall: { width: 700, height: 900, sillHeight: 900 },
  pairedMedium: { width: 900, height: 1100, sillHeight: 900 }
}

/**
 * Common door configurations
 */
export const CommonDoors = {
  standard: { width: 900, height: 2100 },
  wide: { width: 1200, height: 2100 },
  french: { width: 1800, height: 2100 }
}
