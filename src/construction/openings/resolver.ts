import type { OpeningAssemblyId } from '@/building/model'
import { getConfigActions } from '@/construction/config/store'
import type { WallConstructionArea } from '@/construction/geometry'
import { PostOpeningAssembly } from '@/construction/openings/post'
import { SimpleOpeningAssembly } from '@/construction/openings/simple'
import type { ConstructionResult } from '@/construction/results'
import type { InfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

import type { EmptyOpeningConfig, OpeningAssembly, OpeningConfig } from './types'

/**
 * Resolves the opening assembly config using the inheritance hierarchy:
 * Opening.openingAssemblyId → WallAssembly.openingAssemblyId → Global Default
 */
export function resolveOpeningConfig(
  opening?: { openingAssemblyId?: OpeningAssemblyId },
  wallAssembly?: { openingAssemblyId?: OpeningAssemblyId }
): OpeningConfig {
  const configActions = getConfigActions()

  // 1. Try opening-specific override
  if (opening?.openingAssemblyId) {
    const config = configActions.getOpeningAssemblyById(opening.openingAssemblyId)
    if (config) return config
  }

  // 2. Try wall assembly's default
  if (wallAssembly?.openingAssemblyId) {
    const config = configActions.getOpeningAssemblyById(wallAssembly.openingAssemblyId)
    if (config) return config
  }

  // 3. Use global default
  const defaultId = configActions.getDefaultOpeningAssemblyId()
  const config = configActions.getOpeningAssemblyById(defaultId)

  if (!config) {
    throw new Error('Default opening assembly not found')
  }

  return config
}

export function resolveOpeningAssembly(openingAssemblyId?: OpeningAssemblyId): OpeningAssemblyInstance {
  const configActions = getConfigActions()

  if (!openingAssemblyId) {
    openingAssemblyId = configActions.getDefaultOpeningAssemblyId()
  }
  const config = configActions.getOpeningAssemblyById(openingAssemblyId)

  if (!config) {
    throw new Error('Opening assembly not found')
  }

  if (config.type === 'simple') {
    return {
      construct: (area: WallConstructionArea, adjustedHeader: Length, adjustedSill: Length, infill: InfillMethod) =>
        simpleAssembly.construct(area, adjustedHeader, adjustedSill, config, infill),
      get segmentationPadding() {
        return simpleAssembly.getSegmentationPadding(config)
      },
      get needsWallStands() {
        return simpleAssembly.needsWallStands(config)
      }
    }
  } else if (config.type === 'empty') {
    return {
      construct: (area: WallConstructionArea, adjustedHeader: Length, adjustedSill: Length, infill: InfillMethod) =>
        emptyAssembly.construct(area, adjustedHeader, adjustedSill, config, infill),
      get segmentationPadding() {
        return emptyAssembly.getSegmentationPadding(config)
      },
      get needsWallStands() {
        return emptyAssembly.needsWallStands(config)
      }
    }
  } else if (config.type === 'post') {
    return {
      construct: (area: WallConstructionArea, adjustedHeader: Length, adjustedSill: Length, infill: InfillMethod) =>
        postAssembly.construct(area, adjustedHeader, adjustedSill, config, infill),
      get segmentationPadding() {
        return postAssembly.getSegmentationPadding(config)
      },
      get needsWallStands() {
        return postAssembly.needsWallStands(config)
      }
    }
  }

  throw new Error('Invalid opening config type')
}

export class EmptyOpeningAssembly implements OpeningAssembly<EmptyOpeningConfig> {
  *construct(
    _area: WallConstructionArea,
    _adjustedHeader: Length,
    _adjustedSill: Length,
    _config: EmptyOpeningConfig,
    _infill: InfillMethod
  ): Generator<ConstructionResult> {
    // Intentionally empty
  }

  getSegmentationPadding = (_config: EmptyOpeningConfig) => 0
  needsWallStands = (_config: EmptyOpeningConfig) => true
}

const simpleAssembly = new SimpleOpeningAssembly()
const emptyAssembly = new EmptyOpeningAssembly()
const postAssembly = new PostOpeningAssembly()

interface OpeningAssemblyInstance {
  construct: (
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: InfillMethod
  ) => Generator<ConstructionResult>

  get segmentationPadding(): Length
  get needsWallStands(): boolean
}
