import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/building/model/ids'
import type { Perimeter, Storey } from '@/building/model/model'

export interface RingBeamConfigUsage {
  isUsed: boolean
  usedByPerimeters: string[]
}

export interface PerimeterConfigUsage {
  isUsed: boolean
  usedByWalls: string[]
}

/**
 * Checks if a ring beam construction method is currently in use by any perimeters
 */
export function getRingBeamConfigUsage(
  configId: RingBeamConstructionMethodId,
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
    if (perimeter.baseRingBeamMethodId === configId) {
      usedByPerimeters.push(`${storeyName} - Base Ring Beam`)
    }

    // Check top ring beam
    if (perimeter.topRingBeamMethodId === configId) {
      usedByPerimeters.push(`${storeyName} - Top Ring Beam`)
    }
  })

  return {
    isUsed: usedByPerimeters.length > 0,
    usedByPerimeters
  }
}

/**
 * Checks if a perimeter construction method is currently in use by any walls
 */
export function getPerimeterConfigUsage(
  configId: PerimeterConstructionMethodId,
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
      if (wall.constructionMethodId === configId) {
        usedByWalls.push(`${storeyName} - Wall ${wallIndex + 1}`)
      }
    })
  })

  return {
    isUsed: usedByWalls.length > 0,
    usedByWalls
  }
}
