import type { Migration } from './shared'
import { isRecord } from './shared'

export const migrateToVersion2: Migration = state => {
  if (!isRecord(state)) return

  if (!isRecord(state.floorAreas)) {
    state.floorAreas = {}
  }

  if (!isRecord(state.floorOpenings)) {
    state.floorOpenings = {}
  }
}
