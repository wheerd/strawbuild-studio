import type { Opening } from '@/building/model'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionResult } from '@/construction/results'
import type { Length } from '@/shared/geometry'

export interface OpeningAssembly<TConfig extends OpeningAssemblyConfigBase> {
  construct: (roof: Opening, config: TConfig) => Generator<ConstructionResult>
}

export type OpeningAssemblyType = 'simple'

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

export type OpeningConfig = SimpleOpeningConfig

// Validation

export const validateOpeningConfig = (_config: OpeningConfig): void => {
  // TODO
}
