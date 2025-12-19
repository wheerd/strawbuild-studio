import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model/ids'
import type { Perimeter, Roof, Storey } from '@/building/model/model'
import type { WallAssemblyConfig } from '@/construction/config/types'

export interface RingBeamAssemblyUsage {
  isUsed: boolean
  usedByPerimeters: string[]
}

export interface WallAssemblyUsage {
  isUsed: boolean
  usedByWalls: string[]
}

export interface FloorAssemblyUsage {
  isUsed: boolean
  usedByStoreys: string[]
}

/**
 * Checks if a ring beam assembly is currently in use by any perimeters
 */
export function getRingBeamAssemblyUsage(
  assemblyId: RingBeamAssemblyId,
  perimeters: Perimeter[],
  storeys: Storey[]
): RingBeamAssemblyUsage {
  const usedByPerimeters: string[] = []

  // Check all walls in all perimeters for base and top ring beam references
  perimeters.forEach(perimeter => {
    // Get storey name for context
    const storey = storeys.find(s => s.id === perimeter.storeyId)
    const storeyName = storey?.name ?? 'Unknown Floor'

    // Check each wall in the perimeter
    perimeter.walls.forEach((wall, wallIndex) => {
      const wallName = `Wall ${wallIndex + 1}`

      // Check base ring beam
      if (wall.baseRingBeamAssemblyId === assemblyId) {
        usedByPerimeters.push(`${storeyName} - ${wallName} (Base Plate)`)
      }

      // Check top ring beam
      if (wall.topRingBeamAssemblyId === assemblyId) {
        usedByPerimeters.push(`${storeyName} - ${wallName} (Top Plate)`)
      }
    })
  })

  return {
    isUsed: usedByPerimeters.length > 0,
    usedByPerimeters
  }
}

/**
 * Checks if a wall assembly is currently in use by any walls
 */
export function getWallAssemblyUsage(
  assemblyId: WallAssemblyId,
  perimeters: Perimeter[],
  storeys: Storey[]
): WallAssemblyUsage {
  const usedByWalls: string[] = []

  // Check all perimeters and their walls
  perimeters.forEach(perimeter => {
    // Get storey name for context
    const storey = storeys.find(s => s.id === perimeter.storeyId)
    const storeyName = storey?.name ?? 'Unknown Floor'

    // Check each wall in the perimeter
    perimeter.walls.forEach((wall, wallIndex) => {
      if (wall.wallAssemblyId === assemblyId) {
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
 * Checks if a floor assembly is currently in use by any storeys
 */
export function getFloorAssemblyUsage(assemblyId: FloorAssemblyId, storeys: Storey[]): FloorAssemblyUsage {
  const usedByStoreys: string[] = []

  storeys.forEach(storey => {
    if (storey.floorAssemblyId === assemblyId) {
      usedByStoreys.push(storey.name)
    }
  })

  return {
    isUsed: usedByStoreys.length > 0,
    usedByStoreys
  }
}

export interface RoofAssemblyUsage {
  isUsed: boolean
  usedByRoofs: string[]
}

/**
 * Checks if a roof assembly is currently in use by any roofs
 */
export function getRoofAssemblyUsage(assemblyId: RoofAssemblyId, roofs: Roof[], storeys: Storey[]): RoofAssemblyUsage {
  const usedByRoofs = new Set<string>()

  roofs.forEach(roof => {
    if (roof.assemblyId === assemblyId) {
      const storey = storeys.find(s => s.id === roof.storeyId)
      const storeyName = storey?.name ?? 'Unknown Storey'
      const type = roof.type === 'gable' ? 'Gable Roof' : 'Shed Roof'
      usedByRoofs.add(`${storeyName} - ${type}`)
    }
  })

  return {
    isUsed: usedByRoofs.size > 0,
    usedByRoofs: Array.from(usedByRoofs)
  }
}

export interface OpeningAssemblyUsage {
  isUsed: boolean
  usedAsGlobalDefault: boolean
  usedByWallAssemblies: string[]
  usedByOpenings: string[]
}

/**
 * Checks if an opening assembly is currently in use by:
 * - As the global default
 * - As a default in any wall assemblies
 * - By individual openings that override to use this assembly
 */
export function getOpeningAssemblyUsage(
  assemblyId: OpeningAssemblyId,
  perimeters: Perimeter[],
  storeys: Storey[],
  wallAssemblies: WallAssemblyConfig[],
  defaultOpeningAssemblyId: OpeningAssemblyId
): OpeningAssemblyUsage {
  const usedAsGlobalDefault = assemblyId === defaultOpeningAssemblyId
  const usedByWallAssemblies: string[] = []
  const usedByOpenings: string[] = []

  // Check wall assemblies that reference this opening assembly
  wallAssemblies.forEach(wallAssembly => {
    if (wallAssembly.openingAssemblyId === assemblyId) {
      usedByWallAssemblies.push(`Wall Assembly: ${wallAssembly.name}`)
    }
  })

  // Check individual openings that override to use this assembly
  perimeters.forEach(perimeter => {
    const storey = storeys.find(s => s.id === perimeter.storeyId)
    const storeyName = storey?.name ?? 'Unknown Floor'

    perimeter.walls.forEach((wall, wallIndex) => {
      wall.openings.forEach((opening, openingIndex) => {
        if (opening.openingAssemblyId === assemblyId) {
          usedByOpenings.push(`${storeyName} - Wall ${wallIndex + 1} - Opening ${openingIndex + 1}`)
        }
      })
    })
  })

  return {
    isUsed: usedAsGlobalDefault || usedByWallAssemblies.length > 0 || usedByOpenings.length > 0,
    usedAsGlobalDefault,
    usedByWallAssemblies,
    usedByOpenings
  }
}
