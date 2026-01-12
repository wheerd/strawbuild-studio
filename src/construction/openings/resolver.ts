import type { OpeningAssemblyId } from '@/building/model'
import { getConfigActions } from '@/construction/config/store'
import { EmptyOpeningAssembly } from '@/construction/openings/empty'
import { PlankedOpeningAssembly } from '@/construction/openings/planked'
import { PostOpeningAssembly } from '@/construction/openings/post'
import { SimpleOpeningAssembly } from '@/construction/openings/simple'

import type { OpeningAssembly, OpeningConfig } from './types'

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

export function resolveOpeningAssembly(openingAssemblyId?: OpeningAssemblyId): OpeningAssembly {
  const configActions = getConfigActions()

  openingAssemblyId ??= configActions.getDefaultOpeningAssemblyId()
  const config = configActions.getOpeningAssemblyById(openingAssemblyId)

  if (!config) {
    throw new Error('Opening assembly not found')
  }

  switch (config.type) {
    case 'simple':
      return new SimpleOpeningAssembly(config)
    case 'empty':
      return new EmptyOpeningAssembly(config)
    case 'post':
      return new PostOpeningAssembly(config)
    case 'planked':
      return new PlankedOpeningAssembly(config)
    default:
      throw new Error(`Unknown opening assembly type: ${(config as OpeningConfig).type}`)
  }
}
