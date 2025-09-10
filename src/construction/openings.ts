import type { Opening, OpeningId } from '@/model'
import type { Length } from '@/types/geometry'
import type { MaterialId } from './material'
import {
  createConstructionElementId,
  type BaseConstructionSegment,
  type ConstructionElement,
  type ConstructionIssue,
  type WithIssues
} from './base'

export interface OpeningConstructionConfig {
  frameType: 'frame' | 'box' // Default: 'frame'
  framePadding: Length // Default: 15mm
  frameThickness: Length // Default: 60mm
  fillingThickness: Length // Default: 30mm
  additionalPadding: Length // Space needed around opening
  frameMaterial: MaterialId
  fillingMaterial: MaterialId
}

export interface OpeningConstruction extends BaseConstructionSegment {
  openingId: OpeningId
  type: 'opening'
  frameType: 'frame' | 'box'
}

export const constructOpeningFrame = (
  _opening: Opening,
  _config: OpeningConstructionConfig
): WithIssues<ConstructionElement[]> => {
  throw new Error('TODO: Implementation')
}

export const constructOpeningBox = (
  _opening: Opening,
  _config: OpeningConstructionConfig
): WithIssues<ConstructionElement[]> => {
  throw new Error('TODO: Implementation')
}

export const constructOpening = (
  opening: Opening,
  config: OpeningConstructionConfig
): WithIssues<OpeningConstruction> => {
  let errors: ConstructionIssue[]
  let warnings: ConstructionIssue[]
  let elements: ConstructionElement[]
  if (config.frameType === 'box') {
    ;({ it: elements, errors, warnings } = constructOpeningBox(opening, config))
  } else if (config.frameType === 'frame') {
    ;({ it: elements, errors, warnings } = constructOpeningFrame(opening, config))
  } else {
    throw new Error('Invalid opening frame type')
  }
  return {
    it: {
      id: createConstructionElementId(),
      type: 'opening',
      openingId: opening.id,
      position: opening.offsetFromStart,
      width: opening.width,
      frameType: config.frameType,
      elements
    },
    warnings,
    errors
  }
}
