import { isInteriorWallAssemblyId } from '@/building/model/ids'
import { DEFAULT_INTERIOR_WALL_ASSEMBLY_ID } from '@/config/store/slices/interiorWalls.defaults'

import type { Migration } from './shared'
import { isRecord } from './shared'

export const migrateToVersion16: Migration = state => {
  if (!isRecord(state)) return

  const timestamp = Date.now()
  const mutableState = state as Record<string, unknown>
  if (!isRecord(mutableState.timestamps)) mutableState.timestamps = {}
  const timestamps = mutableState.timestamps as Record<string, number>

  if (isRecord(state.intermediateWalls)) {
    for (const [wallId, value] of Object.entries(state.intermediateWalls)) {
      if (!isRecord(value)) continue
      if (typeof value.wallAssemblyId !== 'string' || !isInteriorWallAssemblyId(value.wallAssemblyId)) {
        value.wallAssemblyId = DEFAULT_INTERIOR_WALL_ASSEMBLY_ID
      }
      timestamps[wallId] ??= timestamp
    }
  }

  if (isRecord(state.wallNodes)) {
    for (const [nodeId, value] of Object.entries(state.wallNodes)) {
      if (!isRecord(value)) continue
      if (value.type === 'inner' && typeof value.constructedBy !== 'string') {
        const connectedWallIds = Array.isArray(value.connectedWallIds) ? value.connectedWallIds : []
        const connectedWallId = connectedWallIds.find(id => typeof id === 'string')
        if (connectedWallId) value.constructedBy = connectedWallId
      }
      timestamps[nodeId] ??= timestamp
    }
  }
}
