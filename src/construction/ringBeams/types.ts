import type { Perimeter } from '@/building/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionResult } from '@/construction/results'
import type { Length } from '@/shared/geometry'

export type RingBeamAssemblyType = 'full' | 'double' | 'brick'

export interface RingBeamAssembly {
  construct: (segment: RingBeamSegment, context: PerimeterConstructionContext) => Generator<ConstructionResult>

  get height(): Length
}

export interface RingBeamSegment {
  perimeter: Perimeter
  startIndex: number
  endIndex: number
}

export interface RingBeamConfigBase {
  type: RingBeamAssemblyType
}

export interface FullRingBeamConfig extends RingBeamConfigBase {
  type: 'full'
  height: Length // Default: 60mm
  material: MaterialId
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
}

export interface DoubleRingBeamConfig extends RingBeamConfigBase {
  type: 'double'
  height: Length // Default: 60mm
  material: MaterialId
  thickness: Length // Default: 120mm
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}

export interface BrickRingBeamConfig extends RingBeamConfigBase {
  type: 'brick'

  wallHeight: Length // Default: 30cm
  wallWidth: Length // Default: 25cm
  wallMaterial: MaterialId // Default: AAC brick

  beamThickness: Length // Default: 6cm
  beamWidth: Length // Default: 36cm
  beamMaterial: MaterialId // Default: wood

  waterproofingThickness: Length // Default: 2mm
  waterproofingMaterial: MaterialId // Default: bitumen

  insulationThickness: Length // Default: 10cm
  insulationMaterial: MaterialId // Default: cork
}

export type RingBeamConfig = FullRingBeamConfig | DoubleRingBeamConfig | BrickRingBeamConfig

// Validation

export const validateRingBeamConfig = (config: RingBeamConfig): void => {
  if (config.type === 'full') {
    if (Number(config.height) <= 0) {
      throw new Error('Ring beam height must be greater than 0')
    }
    validateFullRingBeamConfig(config)
  } else if (config.type === 'double') {
    if (Number(config.height) <= 0) {
      throw new Error('Ring beam height must be greater than 0')
    }
    validateDoubleRingBeamConfig(config)
  } else if (config.type === 'brick') {
    validateBrickRingBeamConfig(config)
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

const validateBrickRingBeamConfig = (config: BrickRingBeamConfig): void => {
  if (Number(config.wallHeight) <= 0) {
    throw new Error('Brick wall height must be greater than 0')
  }
  if (Number(config.wallWidth) <= 0) {
    throw new Error('Brick wall width must be greater than 0')
  }
  if (Number(config.beamThickness) <= 0) {
    throw new Error('Beam thickness must be greater than 0')
  }
  if (Number(config.beamWidth) <= 0) {
    throw new Error('Beam width must be greater than 0')
  }
  if (Number(config.waterproofingThickness) < 0) {
    throw new Error('Waterproofing thickness cannot be negative')
  }
}
