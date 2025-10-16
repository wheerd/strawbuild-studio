import type { Perimeter } from '@/building/model'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length } from '@/shared/geometry'

export type RingBeamAssemblyType = 'full' | 'double'

export interface RingBeamAssembly<TConfig extends RingBeamConfig> {
  construct: (perimeter: Perimeter, config: TConfig) => ConstructionModel
}

export interface RingBeamConfigBase {
  type: RingBeamAssemblyType
  height: Length // Default: 60mm
  material: MaterialId
}

export interface FullRingBeamConfig extends RingBeamConfigBase {
  type: 'full'
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
}

export interface DoubleRingBeamConfig extends RingBeamConfigBase {
  type: 'double'
  thickness: Length // Default: 120mm
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}

export type RingBeamConfig = FullRingBeamConfig | DoubleRingBeamConfig

// Validation

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
