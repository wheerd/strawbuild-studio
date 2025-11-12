import type { WallAssemblyId } from '@/building/model/ids'
import type { WallAssemblyConfig } from '@/construction/config/types'
import {
  constructionHeightToFinished,
  constructionOffsetToFinished,
  constructionSillToFinished,
  constructionWidthToFinished
} from '@/shared/utils/openingDimensions'

import type { Migration } from './shared'
import { getPersistedConfigStoreState, isRecord } from './shared'

const getPadding = (
  assemblyId: WallAssemblyId | undefined,
  configs: Record<WallAssemblyId, WallAssemblyConfig> | undefined
): number => {
  if (!assemblyId || !configs) return 0
  return Number(configs[assemblyId]?.openings.padding ?? 0)
}

export const migrateToVersion5: Migration = state => {
  if (!isRecord(state)) return

  const perimeters = state.perimeters
  if (!isRecord(perimeters)) return

  const configState = getPersistedConfigStoreState()
  const wallAssemblyConfigs = configState?.wallAssemblyConfigs

  for (const perimeter of Object.values(perimeters)) {
    if (!isRecord(perimeter)) continue
    const walls = perimeter.walls
    if (!Array.isArray(walls)) continue

    for (const wall of walls) {
      if (!isRecord(wall)) continue
      const openings = wall.openings
      if (!Array.isArray(openings) || openings.length === 0) continue

      const padding = getPadding(wall.wallAssemblyId as WallAssemblyId | undefined, wallAssemblyConfigs)

      for (const opening of openings) {
        if (!isRecord(opening)) continue
        const offset = Number(opening.offsetFromStart)
        if (Number.isFinite(offset)) {
          opening.offsetFromStart = constructionOffsetToFinished(offset, padding)
        }

        const width = Number(opening.width)
        if (Number.isFinite(width)) {
          opening.width = constructionWidthToFinished(width, padding)
        }

        const height = Number(opening.height)
        if (Number.isFinite(height)) {
          opening.height = constructionHeightToFinished(height, padding)
        }

        if ('sillHeight' in opening) {
          const sillHeight = opening.sillHeight as number | undefined
          opening.sillHeight = constructionSillToFinished(sillHeight, padding)
        }
      }
    }
  }
}
