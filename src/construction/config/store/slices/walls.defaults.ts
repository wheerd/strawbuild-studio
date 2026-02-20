import { type WallAssemblyId } from '@/building/model/ids'
import type {
  InfillWallAssemblyConfig,
  ModulesWallAssemblyConfig,
  NonStrawbaleWallAssemblyConfig,
  PrefabModulesWallAssemblyConfig,
  StrawhengeWallAssemblyConfig
} from '@/construction/config/types'
import {
  battens,
  concrete,
  ecococonBox,
  ecococonInclined,
  ecococonLintel,
  ecococonSill,
  ecococonStandard,
  lvl,
  roughWood,
  strawbale
} from '@/construction/materials/material'

import { LAYER_SET_CLAY_PLASTER, LAYER_SET_LIME_PLASTER } from './layers.defaults'
import { DEFAULT_EMPTY_ASSEMBLY, prefabThresholdAssembly } from './opening.defaults'

const infillAssembly: InfillWallAssemblyConfig = {
  id: 'wa_infill_default' as WallAssemblyId,
  name: 'Standard Infill',
  nameKey: $ => $.walls.defaults.standardInfill,
  type: 'infill',
  maxPostSpacing: 900,
  desiredPostSpacing: 800,
  minStrawSpace: 70,
  posts: {
    type: 'double',
    width: 60,
    thickness: 120,
    infillMaterial: strawbale.id,
    material: roughWood.id
  },
  triangularBattens: {
    size: 30,
    material: battens.id,
    inside: false,
    outside: false,
    minLength: 100
  },
  // No openingAssemblyId - uses global default
  insideLayerSetId: LAYER_SET_CLAY_PLASTER.id,
  outsideLayerSetId: LAYER_SET_LIME_PLASTER.id
}

const strawhengeAssembly: StrawhengeWallAssemblyConfig = {
  id: 'wa_strawhenge_default' as WallAssemblyId,
  name: 'Strawhenge Module',
  nameKey: $ => $.walls.defaults.strawhengeModule,
  type: 'strawhenge',
  module: {
    minWidth: 920,
    maxWidth: 920,
    type: 'single',
    frameThickness: 60,
    frameMaterial: roughWood.id,
    strawMaterial: strawbale.id,
    triangularBattens: {
      size: 30,
      material: battens.id,
      inside: false,
      outside: false,
      minLength: 100
    }
  },
  infill: {
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'full',
      width: 60,
      material: roughWood.id
    },
    triangularBattens: {
      size: 30,
      material: battens.id,
      inside: false,
      outside: false,
      minLength: 100
    }
  },
  // No openingAssemblyId - uses global default
  insideLayerSetId: LAYER_SET_CLAY_PLASTER.id,
  outsideLayerSetId: LAYER_SET_LIME_PLASTER.id
}

const modulesAssembly: ModulesWallAssemblyConfig = {
  id: 'wa_module_default' as WallAssemblyId,
  name: 'Default Module',
  nameKey: $ => $.walls.defaults.defaultModule,
  type: 'modules',
  module: {
    minWidth: 920,
    maxWidth: 920,
    type: 'single',
    frameThickness: 60,
    frameMaterial: roughWood.id,
    strawMaterial: strawbale.id,
    triangularBattens: {
      size: 30,
      material: battens.id,
      inside: false,
      outside: false,
      minLength: 100
    }
  },
  infill: {
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'full',
      width: 60,
      material: roughWood.id
    },
    triangularBattens: {
      size: 30,
      material: battens.id,
      inside: false,
      outside: false,
      minLength: 100
    }
  },
  // No openingAssemblyId - uses global default
  insideLayerSetId: LAYER_SET_CLAY_PLASTER.id,
  outsideLayerSetId: LAYER_SET_LIME_PLASTER.id
}

const nonStrawbaleAssembly: NonStrawbaleWallAssemblyConfig = {
  id: 'wa_non_strawbale_default' as WallAssemblyId,
  name: 'Concrete Wall',
  nameKey: $ => $.walls.defaults.concreteWall,
  type: 'non-strawbale',
  material: concrete.id,
  openingAssemblyId: DEFAULT_EMPTY_ASSEMBLY.id, // Non-strawbale walls use empty opening type
  insideLayerSetId: LAYER_SET_CLAY_PLASTER.id,
  outsideLayerSetId: undefined // Custom layers - will be created by migration
}

const ecococonAssembly: PrefabModulesWallAssemblyConfig = {
  id: 'wa_ecococon_default' as WallAssemblyId,
  name: 'Ecococon Modules',
  nameKey: $ => $.walls.defaults.ecococonModules,
  type: 'prefab-modules',
  defaultMaterial: ecococonStandard.id,
  fallbackMaterial: ecococonBox.id,
  inclinedMaterial: ecococonInclined.id,
  lintelMaterial: ecococonLintel.id,
  sillMaterial: ecococonSill.id,
  maxWidth: 850,
  targetWidth: 800,
  preferEqualWidths: true,
  openingAssemblyId: prefabThresholdAssembly.id,
  tallReinforceThreshold: 3000,
  tallReinforceThickness: 15,
  tallReinforceStagger: 800,
  tallReinforceMaterial: lvl.id,
  insideLayerSetId: LAYER_SET_CLAY_PLASTER.id,
  outsideLayerSetId: LAYER_SET_LIME_PLASTER.id
}

export const DEFAULT_WALL_ASSEMBLIES = [
  infillAssembly,
  strawhengeAssembly,
  modulesAssembly,
  nonStrawbaleAssembly,
  ecococonAssembly
]

export const DEFAULT_WALL_ASSEMBLY_ID = infillAssembly.id
