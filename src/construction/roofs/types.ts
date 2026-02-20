import type { Roof } from '@/building/model'
import type { LayerSetId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import type { VerticalOffsetMap } from '@/construction/storeys/offsets'
import type { Length } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

export interface RoofAssembly {
  construct: (roof: Roof, contexts: PerimeterConstructionContext[]) => ConstructionModel

  get topOffset(): Length
  getBottomOffsets: (roof: Roof, map: VerticalOffsetMap, contexts: PerimeterConstructionContext[]) => void
  get constructionThickness(): Length
  get totalThickness(): Length
}

export type RoofAssemblyType = 'monolithic' | 'purlin'

export interface RoofAssemblyConfigBase {
  type: RoofAssemblyType
  insideLayerSetId?: LayerSetId
  topLayerSetId?: LayerSetId
  overhangLayerSetId?: LayerSetId
}

export interface MonolithicRoofConfig extends RoofAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
  infillMaterial: MaterialId
}

export interface PurlinRoofConfig extends RoofAssemblyConfigBase {
  type: 'purlin'
  thickness: Length

  purlinMaterial: MaterialId
  purlinHeight: Length
  purlinWidth: Length
  purlinSpacing: Length
  purlinInset: Length

  infillMaterial: MaterialId

  rafterMaterial: MaterialId
  rafterWidth: Length
  rafterSpacingMin: Length
  rafterSpacing: Length

  ceilingSheathingMaterial: MaterialId
  ceilingSheathingThickness: Length

  deckingMaterial: MaterialId
  deckingThickness: Length

  strawMaterial?: MaterialId
}

export type RoofConfig = MonolithicRoofConfig | PurlinRoofConfig

export interface HeightJumpItem {
  position: number // between 0 and 1
  offsetBefore: Length // Height offset before this position
  offsetAfter: Length // Height offset after this position
}

export interface HeightItem {
  position: number // between 0 and 1
  offset: Length
  nullAfter: boolean
}

export type HeightLine = (HeightJumpItem | HeightItem)[]

// Validation

export const validateRoofConfig = (config: RoofConfig): void => {
  switch (config.type) {
    case 'monolithic':
      if (config.thickness <= 0) {
        throw new Error('Monolithic roof thickness must be positive')
      }
      if (!config.material) {
        throw new Error('Monolithic roof must have a material')
      }
      break
    case 'purlin':
      if (config.thickness <= 0) {
        throw new Error('Purlin roof thickness must be positive')
      }
      if (config.purlinHeight <= 0 || config.purlinWidth <= 0 || config.purlinSpacing <= 0) {
        throw new Error('Purlin dimensions must be positive')
      }
      if (config.rafterWidth <= 0 || config.rafterSpacing <= 0) {
        throw new Error('Rafter dimensions must be positive')
      }
      if (config.rafterSpacingMin > config.rafterSpacing || config.rafterSpacingMin < 0) {
        throw new Error('Rafter min spacing must be between 0 and desired spacing')
      }
      if (config.ceilingSheathingThickness <= 0) {
        throw new Error('Ceiling sheathing thickness must be positive')
      }
      if (config.deckingThickness <= 0) {
        throw new Error('Decking thickness must be positive')
      }
      break
    default:
      assertUnreachable(config, 'Invalid roof type')
  }
}
