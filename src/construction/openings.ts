import type { Opening, OpeningId } from '@/model'
import type { Length } from '@/types/geometry'
import type { MaterialId } from './material'
import {
  createConstructionElementId,
  type BaseConstructionSegment,
  type ConstructionElement,
  type WithIssues
} from './base'
import type { InfillConstructionConfig } from './infill'

export interface OpeningConstructionConfig {
  padding: Length // Default: 15mm

  sillThickness?: Length // Default: 60mm
  sillMaterial?: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId

  fillingThickness?: Length // Default: 30mm
  fillingMaterial?: MaterialId
}

export interface OpeningConstruction extends BaseConstructionSegment {
  openingId: OpeningId
  type: 'opening'
}

export const constructOpeningFrame = (
  _opening: Opening,
  _config: OpeningConstructionConfig,
  _infill: InfillConstructionConfig
): WithIssues<ConstructionElement[]> => {
  throw new Error('TODO: Implementation')
}

export const constructOpening = (
  opening: Opening,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig
): WithIssues<OpeningConstruction> => {
  const { it: elements, errors, warnings } = constructOpeningFrame(opening, config, infill)
  return {
    it: {
      id: createConstructionElementId(),
      type: 'opening',
      openingId: opening.id,
      position: opening.offsetFromStart,
      width: opening.width,
      elements
    },
    warnings,
    errors
  }
}
