import { DoubleRingBeamAssembly } from './double'
import { FullRingBeamAssembly } from './full'
import type { RingBeamAssembly, RingBeamConfig } from './types'

export function resolveRingBeamAssembly(config: RingBeamConfig): RingBeamAssembly {
  switch (config.type) {
    case 'full':
      return new FullRingBeamAssembly(config)
    case 'double':
      return new DoubleRingBeamAssembly(config)
    default:
      throw new Error(`Unknown ring beam assembly type: ${(config as RingBeamConfig).type}`)
  }
}

export * from './types'
export * from './full'
export * from './double'
