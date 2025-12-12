import { DEFAULT_FLOOR_ASSEMBLY_ID, type FloorAssemblyId } from '@/building/model/ids'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { DEFAULT_FLOOR_LAYER_SETS } from '@/construction/layers/defaults'
import { clt, concrete, osb, strawbale, wood } from '@/construction/materials/material'

const cltAssembly: FloorAssemblyConfig = {
  id: DEFAULT_FLOOR_ASSEMBLY_ID,
  name: 'CLT 18cm (6cm)',
  type: 'monolithic',
  thickness: 180,
  material: clt.id,
  layers: {
    topThickness: 60,
    topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
    bottomThickness: 0,
    bottomLayers: []
  }
}

const concreteAssembly: FloorAssemblyConfig = {
  id: 'fa_concrete_default' as FloorAssemblyId,
  name: 'Concrete 20cm (6cm)',
  type: 'monolithic',
  thickness: 200,
  material: concrete.id,
  layers: {
    topThickness: 60,
    topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
    bottomThickness: 0,
    bottomLayers: []
  }
}

const joistAssembly: FloorAssemblyConfig = {
  id: 'fa_joist_default' as FloorAssemblyId,
  name: 'Joist 12x24cm (6cm)',
  type: 'joist',
  constructionHeight: 240,
  joistMaterial: wood.id,
  joistSpacing: 800,
  joistThickness: 120,
  wallBeamThickness: 120,
  wallBeamMaterial: wood.id,
  wallBeamInsideOffset: 40,
  wallInfillMaterial: strawbale.id,
  subfloorMaterial: osb.id,
  subfloorThickness: 22,
  openingSideMaterial: wood.id,
  openingSideThickness: 60,
  layers: {
    topThickness: 60,
    topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
    bottomThickness: 0,
    bottomLayers: []
  }
}

const filledAssembly: FloorAssemblyConfig = {
  id: 'fa_filled_default' as FloorAssemblyId,
  name: 'Filled Joist 12x24cm (6cm)',
  type: 'filled',
  constructionHeight: 360,
  joistThickness: 60,
  joistSpacing: 500,
  joistMaterial: wood.id,
  frameThickness: 60,
  frameMaterial: wood.id,
  subfloorThickness: 22,
  subfloorMaterial: osb.id,
  bottomCladdingThickness: 22,
  bottomCladdingMaterial: osb.id,
  openingFrameThickness: 60,
  openingFrameMaterial: wood.id,
  strawMaterial: undefined,
  layers: {
    topThickness: 60,
    topLayers: DEFAULT_FLOOR_LAYER_SETS['Screet'],
    bottomThickness: 0,
    bottomLayers: []
  }
}

export const DEFAULT_FLOOR_ASSEMBLIES = [cltAssembly, concreteAssembly, joistAssembly, filledAssembly]
export { DEFAULT_FLOOR_ASSEMBLY_ID }
