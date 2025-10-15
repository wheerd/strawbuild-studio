import type { FloorAssemblyId, RingBeamAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'

export interface RingBeamConfigUsage {
  isUsed: boolean
  usedByPerimeters: string[]
}

export interface PerimeterConfigUsage {
  isUsed: boolean
  usedByWalls: string[]
}

export interface SlabConfigUsage {
  isUsed: boolean
  usedByStoreys: string[]
}

/**
 * Checks if a ring beam assembly is currently in use by any perimeters
 */
export function getRingBeamConfigUsage(
  configId: RingBeamAssemblyId,
  perimeters: Perimeter[],
  storeys: Storey[]
): RingBeamConfigUsage {
  const usedByPerimeters: string[] = []

  // Check all perimeters for base and top ring beam references
  perimeters.forEach(perimeter => {
    // Get storey name for context
    const storey = storeys.find(s => s.id === perimeter.storeyId)
    const storeyName = storey?.name ?? 'Unknown Floor'

    // Check base ring beam
    if (perimeter.baseRingBeamAssemblyId === configId) {
      usedByPerimeters.push(`${storeyName} - Base Ring Beam`)
    }

    // Check top ring beam
    if (perimeter.topRingBeamAssemblyId === configId) {
      usedByPerimeters.push(`${storeyName} - Top Ring Beam`)
    }
  })

  return {
    isUsed: usedByPerimeters.length > 0,
    usedByPerimeters
  }
}

/**
 * Checks if a wall assembly is currently in use by any walls
 */
export function getPerimeterConfigUsage(
  configId: WallAssemblyId,
  perimeters: Perimeter[],
  storeys: Storey[]
): PerimeterConfigUsage {
  const usedByWalls: string[] = []

  // Check all perimeters and their walls
  perimeters.forEach(perimeter => {
    // Get storey name for context
    const storey = storeys.find(s => s.id === perimeter.storeyId)
    const storeyName = storey?.name ?? 'Unknown Floor'

    // Check each wall in the perimeter
    perimeter.walls.forEach((wall, wallIndex) => {
      if (wall.wallAssemblyId === configId) {
        usedByWalls.push(`${storeyName} - Wall ${wallIndex + 1}`)
      }
    })
  })

  return {
    isUsed: usedByWalls.length > 0,
    usedByWalls
  }
}

/**
 * Checks if a floor construction config is currently in use by any storeys
 */
export function getSlabConfigUsage(configId: FloorAssemblyId, storeys: Storey[]): SlabConfigUsage {
  const usedByStoreys: string[] = []

  storeys.forEach(storey => {
    if (storey.floorAssemblyId === configId) {
      usedByStoreys.push(storey.name)
    }
  })

  return {
    isUsed: usedByStoreys.length > 0,
    usedByStoreys
  }
}
