import type { MaterialId } from '@/construction/materials/material'
import type { MaterialsState } from '@/construction/materials/store'

export const migrateToVersion3 = (state: MaterialsState): MaterialsState => {
  if (!('timestamps' in state) || typeof state.timestamps !== 'object') {
    state.timestamps = {}
  }

  const timestamp = Date.now()
  const materialIds = Object.keys(state.materials) as MaterialId[]
  for (const materialId of materialIds) {
    if (!(materialId in state.timestamps)) {
      state.timestamps[materialId] = timestamp
    }
  }

  return state
}
