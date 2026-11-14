import { type InteriorWallAssemblyId } from '@/building/model/ids'
import type {
  MonolithicStudWallAssemblyConfig,
  MonolithicWallAssemblyConfig,
  PlankedStudWallAssemblyConfig
} from '@/config/types'
import { clayBrick, concrete, roughWood, strawbale } from '@/materials/defaults'

import { LAYER_SET_CLAY_PLASTER } from './layers.defaults'

const plankedStudAssembly: PlankedStudWallAssemblyConfig = {
  id: 'iwa_planked_default' as InteriorWallAssemblyId,
  name: 'Standard Straw-Filled',
  nameKey: $ => $.walls.defaults.standardStrawFilled,
  type: 'planked-stud',
  maxStudSpacing: 900,
  desiredStudSpacing: 800,
  minStudSpacing: 70,
  studMaterial: roughWood.id,
  studWidth: 40,
  equidistantStuds: true,
  fillMaterial: strawbale.id,
  plankMaterial: roughWood.id,
  plankThickness: 20,
  headPlateMaterial: roughWood.id,
  headPlateThickness: 40,
  solePlateMaterial: roughWood.id,
  solePlateThickness: 40,
  nogginThickness: 40,
  nogginSpacing: 1500,
  equidistantNoggins: true,
  staggerNoggins: false,
  layerSetId: LAYER_SET_CLAY_PLASTER.id
}

const clayBrickAssembly: MonolithicWallAssemblyConfig = {
  id: 'iwa_clay_brick_default' as InteriorWallAssemblyId,
  name: 'Clay Brick Wall',
  nameKey: $ => $.walls.defaults.clayBrickWall,
  type: 'monolithic',
  material: clayBrick.id,
  layerSetId: LAYER_SET_CLAY_PLASTER.id
}

const concreteAssembly: MonolithicWallAssemblyConfig = {
  id: 'iwa_concrete_default' as InteriorWallAssemblyId,
  name: 'Concrete Wall',
  nameKey: $ => $.walls.defaults.concreteInteriorWall,
  type: 'monolithic',
  material: concrete.id,
  layerSetId: LAYER_SET_CLAY_PLASTER.id
}

const woodStudClayBrickAssembly: MonolithicStudWallAssemblyConfig = {
  id: 'iwa_wood_stud_clay_brick_default' as InteriorWallAssemblyId,
  name: 'Wood Studs with Clay Brick Infill',
  nameKey: $ => $.walls.defaults.woodStudClayBrick,
  type: 'monolithic-stud',
  maxStudSpacing: 900,
  desiredStudSpacing: 800,
  minStudSpacing: 200,
  studMaterial: roughWood.id,
  studWidth: 40,
  fillMaterial: clayBrick.id,
  equidistantStuds: true,
  headPlateThickness: 40,
  solePlateThickness: 40,
  nogginThickness: 40,
  nogginSpacing: 1500,
  equidistantNoggins: false,
  staggerNoggins: false,
  layerSetId: LAYER_SET_CLAY_PLASTER.id
}

export const DEFAULT_INTERIOR_WALL_ASSEMBLIES = [
  plankedStudAssembly,
  clayBrickAssembly,
  concreteAssembly,
  woodStudClayBrickAssembly
]

export const DEFAULT_INTERIOR_WALL_ASSEMBLY_ID = plankedStudAssembly.id
