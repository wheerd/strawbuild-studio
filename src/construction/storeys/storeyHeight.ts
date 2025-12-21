import type { Storey } from '@/building/model'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import type { Length } from '@/shared/geometry'

const ZERO_LENGTH = 0 as Length

function getTotalThickness(config: FloorAssemblyConfig | null | undefined): Length {
  if (!config) {
    return ZERO_LENGTH
  }
  const assembly = FLOOR_ASSEMBLIES[config.type]
  return assembly.getTotalThickness(config)
}

function resolveNextFloorAssembly(storey: Storey, override?: FloorAssemblyConfig | null): FloorAssemblyConfig | null {
  if (override !== undefined) {
    return override ?? null
  }

  const { getStoreyAbove } = getModelActions()
  const nextStorey = getStoreyAbove(storey.id)
  if (!nextStorey) {
    return null
  }

  const { getFloorAssemblyById } = getConfigActions()
  return getFloorAssemblyById(nextStorey.floorAssemblyId)
}

export function getNextStoreyFloorThickness(
  storey: Storey,
  nextFloorAssemblyOverride?: FloorAssemblyConfig | null
): Length {
  const nextFloorAssembly = resolveNextFloorAssembly(storey, nextFloorAssemblyOverride)
  return getTotalThickness(nextFloorAssembly)
}

export function getStoreyCeilingHeight(storey: Storey, nextFloorAssemblyOverride?: FloorAssemblyConfig | null): Length {
  const nextThickness = getNextStoreyFloorThickness(storey, nextFloorAssemblyOverride)
  const ceilingHeight = Number(storey.floorHeight) - Number(nextThickness)
  return (ceilingHeight > 0 ? ceilingHeight : 0) as Length
}
