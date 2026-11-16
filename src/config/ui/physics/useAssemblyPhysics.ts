import { useMemo } from 'react'

import { resolveWallAssembly } from '@/construction/assemblies/perimeterWalls'
import type { PerimeterWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import type { AssemblyPhysicsStructure } from '@/construction/assemblies/physics'
import { resolveRoofAssembly } from '@/construction/assemblies/roofs'
import type { RoofConfig } from '@/construction/assemblies/roofs/types'
import type { Length } from '@/shared/geometry'

export function useWallAssemblyPhysics(
  config: PerimeterWallConfig | null,
  thickness: Length,
  height: Length
): AssemblyPhysicsStructure | null {
  return useMemo(() => {
    if (!config) return null
    const assembly = resolveWallAssembly(config)
    return assembly.getPhysicsStructure(thickness, height)
  }, [config, thickness, height])
}

export function useRoofAssemblyPhysics(config: RoofConfig | null): AssemblyPhysicsStructure | null {
  return useMemo(() => {
    if (!config) return null
    const assembly = resolveRoofAssembly(config)
    return assembly.getPhysicsStructure()
  }, [config])
}

export function getWallAssemblyPhysics(
  config: PerimeterWallConfig,
  thickness: Length,
  height: Length
): AssemblyPhysicsStructure {
  const assembly = resolveWallAssembly(config)
  return assembly.getPhysicsStructure(thickness, height)
}

export function getRoofAssemblyPhysics(config: RoofConfig): AssemblyPhysicsStructure {
  const assembly = resolveRoofAssembly(config)
  return assembly.getPhysicsStructure()
}
