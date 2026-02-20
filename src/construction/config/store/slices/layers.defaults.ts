import type { LayerSetId } from '@/building/model/ids'
import type { LayerConfig, LayerNameKey, LayerSetConfig, LayerSetUse } from '@/construction/layers/types'
import {
  battens,
  boards,
  cementScreed,
  clayPlasterBase,
  clayPlasterFine,
  dhf,
  gypsum,
  impactSoundInsulation,
  limePlasterBase,
  limePlasterFine,
  reed,
  windBarrier
} from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'

const createMonolithicLayer = (
  material: MaterialId,
  thickness: number,
  name: string,
  nameKey?: LayerNameKey,
  overlap?: boolean
): LayerConfig => ({
  type: 'monolithic',
  name,
  nameKey,
  material,
  thickness,
  overlap
})

const sumThickness = (layers: LayerConfig[]): number =>
  layers.reduce((total, layer) => total + (layer.overlap ? 0 : layer.thickness), 0)

const createLayerSet = (
  id: LayerSetId,
  name: string,
  nameKey: LayerNameKey | undefined,
  layers: LayerConfig[],
  use: LayerSetUse
): LayerSetConfig => ({
  id,
  name,
  nameKey,
  layers,
  totalThickness: sumThickness(layers),
  use
})

export const LAYER_SET_CLAY_PLASTER: LayerSetConfig = createLayerSet(
  'ls_clay_plaster' as LayerSetId,
  'Clay Plaster',
  $ => $.layerSets.defaults.clayPlaster,
  [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)', $ => $.layers.defaults.clayPlasterBase),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ],
  'wall'
)

export const LAYER_SET_CLAY_PLASTER_DIAGONAL: LayerSetConfig = createLayerSet(
  'ls_clay_plaster_diagonal' as LayerSetId,
  'Clay Plaster with Diagonal Bracing',
  $ => $.layerSets.defaults.clayPlasterDiagonal,
  [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      nameKey: $ => $.layers.defaults.diagonalBracing,
      direction: 'diagonal',
      stripeMaterial: boards.id,
      stripeWidth: 200,
      gapMaterial: clayPlasterBase.id,
      gapWidth: 50,
      thickness: 25
    },
    createMonolithicLayer(clayPlasterFine.id, 5, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ],
  'wall'
)

export const LAYER_SET_LIME_PLASTER: LayerSetConfig = createLayerSet(
  'ls_lime_plaster' as LayerSetId,
  'Lime Plaster',
  $ => $.layerSets.defaults.limePlaster,
  [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ],
  'wall'
)

export const LAYER_SET_LIME_PLASTER_DHF: LayerSetConfig = createLayerSet(
  'ls_lime_plaster_dhf' as LayerSetId,
  'Lime Plaster with DHF',
  $ => $.layerSets.defaults.limePlasterDhf,
  [
    createMonolithicLayer(dhf.id, 16, 'DHF', $ => $.layers.defaults.dhf),
    createMonolithicLayer(reed.id, 9, 'Plaster Ground (Reed)', $ => $.layers.defaults.plasterGroundReed, true),
    createMonolithicLayer(limePlasterBase.id, 10, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 4, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ],
  'wall'
)

export const LAYER_SET_LIME_PLASTER_DIAGONAL: LayerSetConfig = createLayerSet(
  'ls_lime_plaster_diagonal' as LayerSetId,
  'Lime Plaster with Diagonal Bracing',
  $ => $.layerSets.defaults.limePlasterDiagonal,
  [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      nameKey: $ => $.layers.defaults.diagonalBracing,
      direction: 'diagonal',
      stripeMaterial: boards.id,
      stripeWidth: 200,
      gapMaterial: limePlasterBase.id,
      gapWidth: 50,
      thickness: 25
    },
    createMonolithicLayer(limePlasterFine.id, 5, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ],
  'wall'
)

export const LAYER_SET_WOODEN_PLANKING: LayerSetConfig = createLayerSet(
  'ls_wooden_planking' as LayerSetId,
  'Wooden Planking',
  $ => $.layerSets.defaults.woodenPlanking,
  [
    createMonolithicLayer(windBarrier.id, 1, 'Wind Barrier', $ => $.layers.defaults.windBarrier),
    {
      type: 'striped',
      name: 'Battens',
      nameKey: $ => $.layers.defaults.battens,
      direction: 'colinear',
      stripeMaterial: battens.id,
      stripeWidth: 48,
      gapWidth: 500,
      thickness: 24
    },
    createMonolithicLayer(boards.id, 25, 'Wood Planking', $ => $.layers.defaults.woodPlanking)
  ],
  'wall'
)

export const LAYER_SET_WOODEN_PLANKING_DHF: LayerSetConfig = createLayerSet(
  'ls_wooden_planking_dhf' as LayerSetId,
  'Wooden Planking with DHF',
  $ => $.layerSets.defaults.woodenPlankingDhf,
  [
    createMonolithicLayer(dhf.id, 16, 'DHF', $ => $.layers.defaults.dhf),
    {
      type: 'striped',
      name: 'Battens',
      nameKey: $ => $.layers.defaults.battens,
      direction: 'colinear',
      stripeMaterial: battens.id,
      stripeWidth: 48,
      gapWidth: 500,
      thickness: 24
    },
    createMonolithicLayer(boards.id, 25, 'Wood Planking', $ => $.layers.defaults.woodPlanking)
  ],
  'wall'
)

export const LAYER_SET_GYPSUM: LayerSetConfig = createLayerSet(
  'ls_gypsum' as LayerSetId,
  'Gypsum Boards',
  $ => $.layerSets.defaults.gypsumBoards,
  [createMonolithicLayer(gypsum.id, 30, 'Gypsum Boards', $ => $.layers.defaults.gypsumBoards)],
  'wall'
)

export const LAYER_SET_CEILING_PLASTER: LayerSetConfig = createLayerSet(
  'ls_ceiling_plaster' as LayerSetId,
  'Clay Plaster',
  $ => $.layerSets.defaults.ceilingClayPlaster,
  [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)', $ => $.layers.defaults.clayPlasterBase),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ],
  'ceiling'
)

export const LAYER_SET_CEILING_LIME_PLASTER: LayerSetConfig = createLayerSet(
  'ls_ceiling_lime_plaster' as LayerSetId,
  'Lime Plaster',
  $ => $.layerSets.defaults.ceilingLimePlaster,
  [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ],
  'ceiling'
)

export const LAYER_SET_FLOOR_SCREED: LayerSetConfig = createLayerSet(
  'ls_floor_screed' as LayerSetId,
  'Screed',
  $ => $.layerSets.defaults.screed,
  [
    createMonolithicLayer(
      impactSoundInsulation.id,
      25,
      'Impact Sound Insulation',
      $ => $.layers.defaults.impactSoundInsulation
    ),
    createMonolithicLayer(cementScreed.id, 35, 'Screed', $ => $.layers.defaults.screed)
  ],
  'floor'
)

export const LAYER_SET_ROOF_TILES: LayerSetConfig = createLayerSet(
  'ls_roof_tiles' as LayerSetId,
  'Roof Tiles',
  $ => $.layerSets.defaults.tiles,
  [
    createMonolithicLayer(windBarrier.id, 1, 'Wind Paper', $ => $.layers.defaults.windPaper),
    {
      type: 'striped',
      direction: 'colinear',
      name: 'Battens',
      nameKey: $ => $.layers.defaults.battens,
      gapWidth: 500,
      thickness: 40,
      stripeMaterial: battens.id,
      stripeWidth: 60
    },
    {
      type: 'striped',
      direction: 'perpendicular',
      name: 'Counter Battens',
      nameKey: $ => $.layers.defaults.counterBattens,
      gapWidth: 300,
      thickness: 30,
      stripeMaterial: battens.id,
      stripeWidth: 50
    },
    createMonolithicLayer('material_invalid' as MaterialId, 35, 'Tiles', $ => $.layers.defaults.tiles)
  ],
  'roof'
)

export const DEFAULT_LAYER_SETS: LayerSetConfig[] = [
  LAYER_SET_CLAY_PLASTER,
  LAYER_SET_CLAY_PLASTER_DIAGONAL,
  LAYER_SET_LIME_PLASTER,
  LAYER_SET_LIME_PLASTER_DHF,
  LAYER_SET_LIME_PLASTER_DIAGONAL,
  LAYER_SET_WOODEN_PLANKING,
  LAYER_SET_WOODEN_PLANKING_DHF,
  LAYER_SET_GYPSUM,
  LAYER_SET_CEILING_PLASTER,
  LAYER_SET_CEILING_LIME_PLASTER,
  LAYER_SET_FLOOR_SCREED,
  LAYER_SET_ROOF_TILES
]
