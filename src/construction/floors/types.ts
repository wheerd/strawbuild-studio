import type { LayerSetId } from '@/building/model/ids'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import type { ConstructionResult } from '@/construction/results'
import type { Tag } from '@/construction/tags'
import type { Length, PolygonWithHoles2D } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

export interface FloorAssembly {
  construct: (context: PerimeterConstructionContext) => ConstructionModel
  constructCeilingLayers: (polygons: PolygonWithHoles2D[], idPrefix: string) => Generator<ConstructionResult>
  constructFloorLayers: (polygons: PolygonWithHoles2D[], idPrefix: string) => Generator<ConstructionResult>

  get topLayersThickness(): Length
  get bottomLayersThickness(): Length
  get topOffset(): Length
  get bottomOffset(): Length
  get constructionThickness(): Length
  get totalThickness(): Length

  get tags(): Tag[]
}

export type FloorAssemblyType = 'monolithic' | 'joist' | 'filled' | 'hanging-joist'

export interface FloorAssemblyConfigBase {
  type: FloorAssemblyType
  topLayerSetId?: LayerSetId
  bottomLayerSetId?: LayerSetId
}

export interface MonolithicFloorConfig extends FloorAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface JoistFloorConfig extends FloorAssemblyConfigBase {
  type: 'joist'

  constructionHeight: Length

  joistThickness: Length
  joistSpacing: Length
  joistMaterial: MaterialId

  wallBeamThickness: Length
  wallBeamInsideOffset: Length
  wallBeamMaterial: MaterialId
  wallInfillMaterial: MaterialId

  subfloorThickness: Length
  subfloorMaterial: MaterialId

  openingSideThickness: Length
  openingSideMaterial: MaterialId
}

export interface HangingJoistFloorConfig extends FloorAssemblyConfigBase {
  type: 'hanging-joist'

  joistHeight: Length
  joistThickness: Length
  joistSpacing: Length
  joistMaterial: MaterialId

  subfloorThickness: Length
  subfloorMaterial: MaterialId

  openingSideThickness: Length
  openingSideMaterial: MaterialId

  verticalOffset: Length
}

export interface FilledFloorConfig extends FloorAssemblyConfigBase {
  type: 'filled'

  constructionHeight: Length

  joistThickness: Length
  joistSpacing: Length
  joistMaterial: MaterialId

  frameThickness: Length
  frameMaterial: MaterialId

  subfloorThickness: Length
  subfloorMaterial: MaterialId

  ceilingSheathingThickness: Length
  ceilingSheathingMaterial: MaterialId

  openingFrameThickness: Length
  openingFrameMaterial: MaterialId

  strawMaterial?: MaterialId
}

export type FloorConfig = MonolithicFloorConfig | JoistFloorConfig | FilledFloorConfig | HangingJoistFloorConfig

// Validation

export const validateFloorConfig = (config: FloorConfig): void => {
  switch (config.type) {
    case 'monolithic':
      validateMonolithicFloorConfig(config)
      break
    case 'joist':
      validateJoistFloorConfig(config)
      break
    case 'filled':
      validateFilledFloorConfig(config)
      break
    case 'hanging-joist':
      validateHangingJoistFloorConfig(config)
      break
    default:
      assertUnreachable(config, 'Invalid floor assembly type')
  }
}

const validateMonolithicFloorConfig = (config: MonolithicFloorConfig): void => {
  if (config.thickness <= 0) {
    throw new Error('CLT thickness must be greater than 0')
  }
}

const validateJoistFloorConfig = (config: JoistFloorConfig): void => {
  if (config.constructionHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Joist dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
}

const validateFilledFloorConfig = (config: FilledFloorConfig): void => {
  if (config.constructionHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Filled floor dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.frameThickness <= 0) {
    throw new Error('Frame thickness must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
  if (config.ceilingSheathingThickness <= 0) {
    throw new Error('Ceiling sheathing thickness must be greater than 0')
  }
  if (config.openingFrameThickness <= 0) {
    throw new Error('Opening frame thickness must be greater than 0')
  }
}

const validateHangingJoistFloorConfig = (config: HangingJoistFloorConfig): void => {
  if (config.joistHeight <= 0 || config.joistThickness <= 0) {
    throw new Error('Joist dimensions must be greater than 0')
  }
  if (config.joistSpacing <= 0) {
    throw new Error('Joist spacing must be greater than 0')
  }
  if (config.subfloorThickness <= 0) {
    throw new Error('Subfloor thickness must be greater than 0')
  }
}
