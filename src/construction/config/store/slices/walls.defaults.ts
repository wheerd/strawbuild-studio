import { type WallAssemblyId } from '@/building/model/ids'
import type {
  InfillWallAssemblyConfig,
  ModulesWallAssemblyConfig,
  NonStrawbaleWallAssemblyConfig,
  StrawhengeWallAssemblyConfig
} from '@/construction/config/types'
import { DEFAULT_WALL_LAYER_SETS } from '@/construction/layers/defaults'
import type { MaterialId } from '@/construction/materials/material'
import { concrete, limePlasterBase, limePlasterFine, roughWood, strawbale } from '@/construction/materials/material'

import { DEFAULT_EMPTY_ASSEMBLY } from './opening.defaults'

const infillAssembly: InfillWallAssemblyConfig = {
  id: 'wa_infill_default' as WallAssemblyId,
  name: 'Standard Infill',
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
  // No openingAssemblyId - uses global default
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_WALL_LAYER_SETS['Clay Plaster'],
    outsideThickness: 30,
    outsideLayers: DEFAULT_WALL_LAYER_SETS['Lime Plaster']
  }
}

const strawhengeAssembly: StrawhengeWallAssemblyConfig = {
  id: 'wa_strawhenge_default' as WallAssemblyId,
  name: 'Strawhenge Module',
  type: 'strawhenge',
  module: {
    minWidth: 920,
    maxWidth: 920,
    type: 'single',
    frameThickness: 60,
    frameMaterial: roughWood.id,
    strawMaterial: strawbale.id
  },
  infill: {
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'full',
      width: 60,
      material: roughWood.id
    }
  },
  // No openingAssemblyId - uses global default
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_WALL_LAYER_SETS['Clay Plaster'],
    outsideThickness: 30,
    outsideLayers: DEFAULT_WALL_LAYER_SETS['Lime Plaster']
  }
}

const modulesAssembly: ModulesWallAssemblyConfig = {
  id: 'wa_module_default' as WallAssemblyId,
  name: 'Default Module',
  type: 'modules',
  module: {
    minWidth: 920,
    maxWidth: 920,
    type: 'single',
    frameThickness: 60,
    frameMaterial: roughWood.id,
    strawMaterial: strawbale.id
  },
  infill: {
    maxPostSpacing: 900,
    desiredPostSpacing: 800,
    minStrawSpace: 70,
    posts: {
      type: 'full',
      width: 60,
      material: roughWood.id
    }
  },
  // No openingAssemblyId - uses global default
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_WALL_LAYER_SETS['Clay Plaster'],
    outsideThickness: 30,
    outsideLayers: DEFAULT_WALL_LAYER_SETS['Lime Plaster']
  }
}

const nonStrawbaleAssembly: NonStrawbaleWallAssemblyConfig = {
  id: 'wa_non_strawbale_default' as WallAssemblyId,
  name: 'Concrete Wall',
  type: 'non-strawbale',
  material: concrete.id,
  openingAssemblyId: DEFAULT_EMPTY_ASSEMBLY.id, // Non-strawbale walls use empty opening type
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_WALL_LAYER_SETS['Clay Plaster'],
    outsideThickness: 160 + 30,
    outsideLayers: [
      { type: 'monolithic', name: 'Insulation', material: 'material_invalid' as MaterialId, thickness: 160 },
      { type: 'monolithic', name: 'Base Plaster (Lime)', material: limePlasterBase.id, thickness: 20 },
      { type: 'monolithic', name: 'Fine Plaster (Lime)', material: limePlasterFine.id, thickness: 10 }
    ]
  }
}

export const DEFAULT_WALL_ASSEMBLIES = [infillAssembly, strawhengeAssembly, modulesAssembly, nonStrawbaleAssembly]

export const DEFAULT_WALL_ASSEMBLY_ID = infillAssembly.id
