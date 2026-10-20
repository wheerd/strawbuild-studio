import type { IntermediateWallWithGeometry, OpeningAssemblyId } from '@/building/model'
import type { LayerSetId } from '@/building/model/ids'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import type { Tag } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import type { Length } from '@/shared/geometry'
import { assertUnreachable } from '@/shared/utils'

export interface InteriorWallAssembly {
  construct: (
    wall: IntermediateWallWithGeometry,
    storeyContext: StoreyContext,
    perimeterContext: PerimeterConstructionContext
  ) => ConstructionModel
  get tags(): Tag[]
}

export type InteriorWallAssemblyType = 'monolithic' | 'planked-stud' | 'monolithic-stud'

export interface InteriorWallBaseConfig {
  type: InteriorWallAssemblyType
  layerSetId: LayerSetId
  openingAssemblyId?: OpeningAssemblyId
}

export interface WallStudConfig {
  minStudSpacing: Length // Default: 70mm
  desiredStudSpacing: Length // Default: 800mm
  maxStudSpacing: Length // Default: 900mm
  studWidth: Length // Default: 60mm
  studMaterial: MaterialId
}

export interface MonolithicWallConfig extends InteriorWallBaseConfig {
  type: 'monolithic'
  material: MaterialId
}

export interface PlankedStudWallConfig extends WallStudConfig, InteriorWallBaseConfig {
  type: 'planked-stud'
  plankThickness: Length
  plankMaterial: MaterialId
  fillMaterial?: MaterialId
}

export interface MonolithicStudWallConfig extends WallStudConfig, InteriorWallBaseConfig {
  type: 'monolithic-stud'
  fillMaterial: MaterialId
}

export type InteriorWallConfig = MonolithicWallConfig | PlankedStudWallConfig | MonolithicStudWallConfig

// Validation

const ensurePositive = (value: number, message: string) => {
  if (value <= 0) {
    throw new Error(message)
  }
}

export const validateInteriorWallConfig = (config: InteriorWallConfig): void => {
  const ensureStudConfig = (studConfig: WallStudConfig): void => {
    ensurePositive(studConfig.minStudSpacing, 'Minimum stud spacing must be greater than 0')
    ensurePositive(studConfig.desiredStudSpacing, 'Desired stud spacing must be greater than 0')
    ensurePositive(studConfig.maxStudSpacing, 'Maximum stud spacing must be greater than 0')
    ensurePositive(studConfig.studWidth, 'Stud width must be greater than 0')
    if (studConfig.maxStudSpacing < studConfig.minStudSpacing) {
      throw new Error('Minimum stud spacing must not be bigger than maximum stud spacing')
    }
    if (
      studConfig.desiredStudSpacing < studConfig.minStudSpacing ||
      studConfig.desiredStudSpacing > studConfig.maxStudSpacing
    ) {
      throw new Error('Desired stud spacing must be between minimum and maximum stud spacing')
    }
  }

  switch (config.type) {
    case 'monolithic':
      break
    case 'planked-stud':
      ensureStudConfig(config)
      ensurePositive(config.plankThickness, 'Plank thickness must be greater than 0')
      break
    case 'monolithic-stud':
      ensureStudConfig(config)
      break
    default:
      assertUnreachable(config, 'Invalid interior wall assembly type')
  }
}
