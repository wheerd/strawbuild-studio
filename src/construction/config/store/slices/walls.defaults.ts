import { type WallAssemblyId } from '@/building/model/ids'
import type {
  InfillWallAssemblyConfig,
  ModulesWallAssemblyConfig,
  NonStrawbaleWallAssemblyConfig,
  PrefabModulesWallAssemblyConfig,
  StrawhengeWallAssemblyConfig
} from '@/construction/config/types'
import { PRESET_WALL_CLAY_PLASTER, PRESET_WALL_LIME_PLASTER } from '@/construction/layers/defaults'
import type { MaterialId } from '@/construction/materials/material'
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

import { DEFAULT_EMPTY_ASSEMBLY, prefabPlankedAssembly } from './opening.defaults'

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
  layers: {
    insideThickness: 30,
    insideLayers: PRESET_WALL_CLAY_PLASTER.layers,
    outsideThickness: 30,
    outsideLayers: PRESET_WALL_LIME_PLASTER.layers
  }
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
  layers: {
    insideThickness: 30,
    insideLayers: PRESET_WALL_CLAY_PLASTER.layers,
    outsideThickness: 30,
    outsideLayers: PRESET_WALL_LIME_PLASTER.layers
  }
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
  layers: {
    insideThickness: 30,
    insideLayers: PRESET_WALL_CLAY_PLASTER.layers,
    outsideThickness: 30,
    outsideLayers: PRESET_WALL_LIME_PLASTER.layers
  }
}

const nonStrawbaleAssembly: NonStrawbaleWallAssemblyConfig = {
  id: 'wa_non_strawbale_default' as WallAssemblyId,
  name: 'Concrete Wall',
  nameKey: $ => $.walls.defaults.concreteWall,
  type: 'non-strawbale',
  material: concrete.id,
  openingAssemblyId: DEFAULT_EMPTY_ASSEMBLY.id, // Non-strawbale walls use empty opening type
  layers: {
    insideThickness: 30,
    insideLayers: PRESET_WALL_CLAY_PLASTER.layers,
    outsideThickness: 160 + 30,
    outsideLayers: [
      {
        type: 'monolithic',
        name: 'Insulation',
        nameKey: $ => $.layers.defaults.insulation,
        material: 'material_invalid' as MaterialId,
        thickness: 160
      },
      ...PRESET_WALL_LIME_PLASTER.layers
    ]
  }
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
  openingAssemblyId: prefabPlankedAssembly.id,
  tallReinforceThreshold: 3000,
  tallReinforceThickness: 15,
  tallReinforceStagger: 800,
  tallReinforceMaterial: lvl.id,
  layers: {
    insideThickness: 30,
    insideLayers: PRESET_WALL_CLAY_PLASTER.layers,
    outsideThickness: 30,
    outsideLayers: PRESET_WALL_LIME_PLASTER.layers
  }
}

export const DEFAULT_WALL_ASSEMBLIES = [
  infillAssembly,
  strawhengeAssembly,
  modulesAssembly,
  nonStrawbaleAssembly,
  ecococonAssembly
]

export const DEFAULT_WALL_ASSEMBLY_ID = infillAssembly.id
