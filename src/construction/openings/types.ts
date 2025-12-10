import type { WallConstructionArea } from '@/construction/geometry'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionResult } from '@/construction/results'
import type { InfillMethod } from '@/construction/walls/types'
import type { Length } from '@/shared/geometry'
import type { OpeningConstructionDimensions } from '@/shared/utils/openingDimensions'

export interface OpeningAssembly<TConfig extends OpeningAssemblyConfigBase> {
  construct: (
    area: WallConstructionArea,
    openings: OpeningConstructionDimensions[],
    zOffset: Length,
    config: TConfig,
    infill: InfillMethod
  ) => Generator<ConstructionResult>
}

export type OpeningAssemblyType = 'simple' | 'empty'

export interface OpeningAssemblyConfigBase {
  type: OpeningAssemblyType
  padding: Length
}

export interface SimpleOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'simple'

  sillThickness: Length // Default: 60mm
  sillMaterial: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId
}

export interface EmptyOpeningConfig extends OpeningAssemblyConfigBase {
  type: 'empty'
  // Only padding, no sill/header materials or thicknesses
}

export type OpeningConfig = SimpleOpeningConfig | EmptyOpeningConfig

// Validation

export const validateOpeningConfig = (config: OpeningConfig): void => {
  if (config.padding < 0) {
    throw new Error('Padding cannot be negative')
  }

  if (config.type === 'simple') {
    if (config.sillThickness <= 0) {
      throw new Error('Sill thickness must be positive')
    }
    if (config.headerThickness <= 0) {
      throw new Error('Header thickness must be positive')
    }
  }
  // 'empty' type has no additional validation
}
