import type { FloorAssemblyId } from '@/building/model/ids'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { resolveFloorAssembly } from '@/construction/floors'

import type { Migration } from './shared'
import { getPersistedConfigStoreState, isRecord } from './shared'

type PersistedStoreyRecord = Record<string, unknown> & {
  level?: number
  floorAssemblyId?: FloorAssemblyId
  height?: number
  floorHeight?: number
}

const getThicknessFromConfig = (
  configs: Record<FloorAssemblyId, FloorAssemblyConfig> | undefined,
  floorAssemblyId: FloorAssemblyId | undefined
): number => {
  if (!configs || !floorAssemblyId) return 0
  const config = configs[floorAssemblyId]
  if (!config) return 0
  const assembly = resolveFloorAssembly(config)
  return Number(assembly.totalThickness)
}

export const migrateToVersion4: Migration = state => {
  if (!isRecord(state)) return

  const storeysRecord = state.storeys
  if (!isRecord(storeysRecord)) return

  const writableState = state as Record<string, unknown>

  if ('defaultHeight' in state && typeof state.defaultHeight === 'number') {
    if (writableState.defaultFloorHeight === undefined) {
      writableState.defaultFloorHeight = state.defaultHeight
    }
    delete writableState.defaultHeight
  }

  const configState = getPersistedConfigStoreState()
  const floorAssemblyConfigs = configState?.floorAssemblyConfigs

  const orderedStoreys = Object.values(storeysRecord)
    .filter(isRecord)
    .map(storey => storey as unknown as PersistedStoreyRecord)
    .sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0) || 0)

  for (let index = 0; index < orderedStoreys.length; index++) {
    const current = orderedStoreys[index]
    const legacyHeight = typeof current.height === 'number' ? current.height : null

    if (legacyHeight === null) {
      continue
    }

    const nextStorey = orderedStoreys[index + 1]
    const nextThickness = nextStorey ? getThicknessFromConfig(floorAssemblyConfigs, nextStorey.floorAssemblyId) : 0

    current.floorHeight = legacyHeight + nextThickness
    delete current.height
  }
}
