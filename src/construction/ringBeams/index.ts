import { DoubleRingBeamAssembly } from './double'
import { FullRingBeamAssembly } from './full'
import type {
  DoubleRingBeamConfig,
  FullRingBeamConfig,
  RingBeamAssembly,
  RingBeamAssemblyType,
  RingBeamConfig
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RING_BEAM_ASSEMBLIES: Record<RingBeamAssemblyType, RingBeamAssembly<any>> = {
  full: new FullRingBeamAssembly(),
  double: new DoubleRingBeamAssembly()
}

export * from './types'
export * from './full'
export * from './double'

// Validation functions for ring beam configurations
export const validateRingBeamConfig = (config: RingBeamConfig): void => {
  // Validate common fields
  if (Number(config.height) <= 0) {
    throw new Error('Ring beam height must be greater than 0')
  }

  if (config.type === 'full') {
    validateFullRingBeamConfig(config)
  } else if (config.type === 'double') {
    validateDoubleRingBeamConfig(config)
  } else {
    throw new Error('Invalid ring beam type')
  }
}

const validateFullRingBeamConfig = (config: FullRingBeamConfig): void => {
  if (Number(config.width) <= 0) {
    throw new Error('Ring beam width must be greater than 0')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}

const validateDoubleRingBeamConfig = (config: DoubleRingBeamConfig): void => {
  if (Number(config.thickness) <= 0) {
    throw new Error('Ring beam thickness must be greater than 0')
  }
  if (Number(config.spacing) < 0) {
    throw new Error('Ring beam spacing cannot be negative')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}
