import { type RoofAssemblyId } from '@/building/model/ids'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { DEFAULT_CEILING_LAYER_SETS, DEFAULT_ROOF_LAYER_SETS } from '@/construction/layers/defaults'
import { clt, strawbale, wood } from '@/construction/materials/material'

const monolithicAssembly: RoofAssemblyConfig = {
  id: 'ra_clt_default' as RoofAssemblyId,
  name: 'CLT Monolithic 18cm',
  type: 'monolithic',
  thickness: 180,
  material: clt.id,
  infillMaterial: wood.id,
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_CEILING_LAYER_SETS['Clay Plaster'],
    topThickness: 126,
    topLayers: DEFAULT_ROOF_LAYER_SETS['Tiles'],
    overhangThickness: 0,
    overhangLayers: []
  }
}

const purlinAssembly: RoofAssemblyConfig = {
  id: 'ra_purlin_default' as RoofAssemblyId,
  name: 'Purlin Roof (Straw)',
  type: 'purlin',
  thickness: 500,
  purlinMaterial: wood.id,
  purlinHeight: 220,
  purlinWidth: 60,
  purlinSpacing: 1000,
  infillMaterial: strawbale.id,
  rafterMaterial: wood.id,
  rafterWidth: 60,
  rafterSpacingMin: 600,
  rafterSpacing: 800,
  rafterSpacingMax: 1000,
  insideCladdingMaterial: wood.id,
  insideCladdingThickness: 25,
  topCladdingMaterial: wood.id,
  topCladdingThickness: 25,
  strawMaterial: strawbale.id,
  layers: {
    insideThickness: 30,
    insideLayers: DEFAULT_CEILING_LAYER_SETS['Clay Plaster'],
    topThickness: 126,
    topLayers: DEFAULT_ROOF_LAYER_SETS['Tiles'],
    overhangThickness: 0,
    overhangLayers: []
  }
}

export const DEFAULT_ROOF_ASSEMBLIES = [purlinAssembly, monolithicAssembly]

export const DEFAULT_ROOF_ASSEMBLY_ID = monolithicAssembly.id
