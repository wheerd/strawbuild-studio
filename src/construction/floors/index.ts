import { FilledFloorAssembly } from './filled'
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
    default:
      throw new Error(`Unknown floor assembly type: ${(config as FloorConfig).type}`)
  }
}

export * from './types'
