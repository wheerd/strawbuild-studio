import { assertUnreachable } from '@/shared/utils'

import { FilledFloorAssembly } from './filled'
import { HangingJoistFloorAssembly } from './hanging-joists'
import { JoistFloorAssembly } from './joists'
import { MonolithicFloorAssembly } from './monolithic'
import type { FloorAssembly, FloorConfig } from './types'

export function resolveFloorAssembly(config: FloorConfig): FloorAssembly {
  switch (config.type) {
    case 'monolithic':
      return new MonolithicFloorAssembly(config)
    case 'joist':
      return new JoistFloorAssembly(config)
    case 'filled':
      return new FilledFloorAssembly(config)
    case 'hanging-joist':
      return new HangingJoistFloorAssembly(config)
    default:
      assertUnreachable(config, `Unknown floor assembly type: ${(config as FloorConfig).type}`)
  }
}

export * from './types'
