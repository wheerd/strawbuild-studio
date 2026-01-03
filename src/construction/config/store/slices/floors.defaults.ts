import { DEFAULT_FLOOR_ASSEMBLY_ID, type FloorAssemblyId } from '@/building/model/ids'
import type { FloorAssemblyConfig } from '@/construction/config/types'
import { PRESET_FLOOR_SCREED } from '@/construction/layers/defaults'
import { clt, concrete, glt, osb, roughWood, strawbale } from '@/construction/materials/material'

const cltAssembly: FloorAssemblyConfig = {
  id: DEFAULT_FLOOR_ASSEMBLY_ID,
  name: 'CLT 18cm (6cm)',
  nameKey: $ => $.floors.defaults.clt18cm,
  type: 'monolithic',
  thickness: 180,
  material: clt.id,
  layers: {
    topThickness: 60,
    topLayers: PRESET_FLOOR_SCREED.layers,
    bottomThickness: 0,
    bottomLayers: []
  }
}

const concreteAssembly: FloorAssemblyConfig = {
  id: 'fa_concrete_default' as FloorAssemblyId,
  name: 'Concrete 20cm (6cm)',
  nameKey: $ => $.floors.defaults.concrete20cm,
  type: 'monolithic',
  thickness: 200,
  material: concrete.id,
  layers: {
    topThickness: 60,
    topLayers: PRESET_FLOOR_SCREED.layers,
    bottomThickness: 0,
    bottomLayers: []
  }
}

const joistAssembly: FloorAssemblyConfig = {
  id: 'fa_joist_default' as FloorAssemblyId,
  name: 'Joist 12x24cm (6cm)',
  nameKey: $ => $.floors.defaults.joist12x24cm,
  type: 'joist',
  constructionHeight: 240,
  joistMaterial: glt.id,
  joistSpacing: 800,
  joistThickness: 80,
  wallBeamThickness: 120,
  wallBeamMaterial: glt.id,
  wallBeamInsideOffset: 40,
  wallInfillMaterial: strawbale.id,
  subfloorMaterial: osb.id,
  subfloorThickness: 22,
  openingSideMaterial: roughWood.id,
  openingSideThickness: 60,
  layers: {
    topThickness: 60,
    topLayers: PRESET_FLOOR_SCREED.layers,
    bottomThickness: 0,
    bottomLayers: []
  }
}

const filledAssembly: FloorAssemblyConfig = {
  id: 'fa_filled_default' as FloorAssemblyId,
  name: 'Filled Joist 12x24cm (6cm)',
  nameKey: $ => $.floors.defaults.filledJoist12x24cm,
  type: 'filled',
  constructionHeight: 360,
  joistThickness: 80,
  joistSpacing: 800,
  joistMaterial: glt.id,
  frameThickness: 60,
  frameMaterial: roughWood.id,
  subfloorThickness: 22,
  subfloorMaterial: osb.id,
  ceilingSheathingThickness: 22,
  ceilingSheathingMaterial: osb.id,
  openingFrameThickness: 60,
  openingFrameMaterial: roughWood.id,
  strawMaterial: undefined,
  layers: {
    topThickness: 60,
    topLayers: PRESET_FLOOR_SCREED.layers,
    bottomThickness: 0,
    bottomLayers: []
  }
}

export const DEFAULT_FLOOR_ASSEMBLIES = [cltAssembly, concreteAssembly, joistAssembly, filledAssembly]
export { DEFAULT_FLOOR_ASSEMBLY_ID }
