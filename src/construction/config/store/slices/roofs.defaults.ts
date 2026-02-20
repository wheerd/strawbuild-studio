import { type RoofAssemblyId } from '@/building/model/ids'
import { LAYER_SET_CEILING_PLASTER, LAYER_SET_ROOF_TILES } from '@/construction/config/store/slices/layers.defaults'
import type { RoofAssemblyConfig } from '@/construction/config/types'
import { clt, fireProtectionBoarding, glt, osb, strawbale, woodwool } from '@/construction/materials/material'

const monolithicAssembly: RoofAssemblyConfig = {
  id: 'ra_clt_default' as RoofAssemblyId,
  name: 'CLT Monolithic 18cm',
  nameKey: $ => $.roofs.defaults.cltMonolithic18cm,
  type: 'monolithic',
  thickness: 180,
  material: clt.id,
  infillMaterial: woodwool.id,
  insideLayerSetId: LAYER_SET_CEILING_PLASTER.id,
  topLayerSetId: LAYER_SET_ROOF_TILES.id,
  overhangLayerSetId: undefined
}

const purlinAssembly: RoofAssemblyConfig = {
  id: 'ra_purlin_default' as RoofAssemblyId,
  name: 'Purlin Roof (Straw)',
  nameKey: $ => $.roofs.defaults.purlinRoofStraw,
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
  insideLayerSetId: LAYER_SET_CEILING_PLASTER.id,
  topLayerSetId: LAYER_SET_ROOF_TILES.id,
  overhangLayerSetId: undefined
}

export const DEFAULT_ROOF_ASSEMBLIES = [purlinAssembly, monolithicAssembly]

export const DEFAULT_ROOF_ASSEMBLY_ID = purlinAssembly.id
