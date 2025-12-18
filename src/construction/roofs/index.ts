import { PurlinRoofAssembly } from '@/construction/roofs/purlin'

import { MonolithicRoofAssembly } from './monolithic'
import type { RoofAssembly, RoofConfig } from './types'

export function resolveRoofAssembly(config: RoofConfig): RoofAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicRoofAssembly(config)
    case 'purlin':
      return new PurlinRoofAssembly(config)
    default:
      throw new Error(`Unknown roof assembly type: ${(config as RoofConfig).type}`)
  }
}

export * from './types'
export * from './monolithic'
