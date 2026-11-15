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

export type InteriorWallAssemblyType = 'monolithic' | 'stud'

export interface InteriorWallBaseConfig {
  type: InteriorWallAssemblyType
  layerSetId: LayerSetId
  openingAssemblyId?: OpeningAssemblyId
}

export interface MonolithicWallConfig extends InteriorWallBaseConfig {
  type: 'monolithic'
  material: MaterialId
}

export interface StudWallConfig extends InteriorWallBaseConfig {
  type: 'stud'

  minStudSpacing: Length // Default: 70mm
  desiredStudSpacing: Length // Default: 800mm
  maxStudSpacing: Length // Default: 900mm
  studWidth: Length // Default: 60mm
  studMaterial: MaterialId
  equidistantStuds: boolean

  headPlateMaterial?: MaterialId
  headPlateThickness: Length // Default: 60mm
  solePlateMaterial?: MaterialId
  solePlateThickness: Length // Default: 60mm

  nogginMaterial?: MaterialId
  nogginThickness: Length // Default: 60mm
  nogginSpacing: Length // Default: 1500mm
  equidistantNoggins: boolean
  staggerNoggins: boolean

  plankThickness: Length
  plankMaterial?: MaterialId

  fillMaterial?: MaterialId
}

export type InteriorWallConfig = MonolithicWallConfig | StudWallConfig

// Validation

const ensurePositive = (value: number, message: string) => {
  if (value <= 0) {
    throw new Error(message)
  }
}

export const validateInteriorWallConfig = (config: InteriorWallConfig): void => {
  switch (config.type) {
    case 'monolithic':
      break
    case 'stud':
      ensurePositive(config.minStudSpacing, 'Minimum stud spacing must be greater than 0')
      ensurePositive(config.desiredStudSpacing, 'Desired stud spacing must be greater than 0')
      ensurePositive(config.maxStudSpacing, 'Maximum stud spacing must be greater than 0')
      ensurePositive(config.studWidth, 'Stud width must be greater than 0')
      if (config.maxStudSpacing < config.minStudSpacing) {
        throw new Error('Minimum stud spacing must not be bigger than maximum stud spacing')
      }
      if (config.desiredStudSpacing < config.minStudSpacing || config.desiredStudSpacing > config.maxStudSpacing) {
        throw new Error('Desired stud spacing must be between minimum and maximum stud spacing')
      }
      break
    default:
      assertUnreachable(config, 'Invalid interior wall assembly type')
  }
}
