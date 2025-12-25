import { type RoofAssemblyId } from '@/building/model/ids'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { DEFAULT_CEILING_LAYER_SETS, DEFAULT_ROOF_LAYER_SETS } from '@/construction/layers/defaults'
import { clt, fireProtectionBoarding, glt, osb, strawbale, woodwool } from '@/construction/materials/material'

const monolithicAssembly: RoofAssemblyConfig = {
  id: 'ra_clt_default' as RoofAssemblyId,
  name: 'CLT Monolithic 18cm',
  type: 'monolithic',
  thickness: 180,
  material: clt.id,
  infillMaterial: woodwool.id,
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
  thickness: 360,
  purlinMaterial: glt.id,
  purlinHeight: 240,
  purlinWidth: 120,
  purlinSpacing: 6000,
  purlinInset: 20,
  infillMaterial: strawbale.id,
  rafterMaterial: glt.id,
  rafterWidth: 80,
  rafterSpacingMin: 70,
  rafterSpacing: 500,
  ceilingSheathingMaterial: fireProtectionBoarding.id,
  ceilingSheathingThickness: 40,
  deckingMaterial: osb.id,
  deckingThickness: 22,
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
