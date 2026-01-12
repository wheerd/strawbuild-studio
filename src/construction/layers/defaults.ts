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
import type { Length } from '@/shared/geometry'

import type { LayerConfig, LayerNameKey } from './types'

const createMonolithicLayer = (
  material: MaterialId,
  thickness: Length,
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

export interface LayerPreset {
  readonly nameKey: LayerNameKey
  readonly layers: LayerConfig[]
}

// Wall layer presets
export const PRESET_WALL_CLAY_PLASTER: LayerPreset = {
  nameKey: $ => $.layers.presets.clayPlaster,
  layers: [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)', $ => $.layers.defaults.clayPlasterBase),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ]
}

export const PRESET_WALL_CLAY_PLASTER_DIAGONAL: LayerPreset = {
  nameKey: $ => $.layers.presets.clayPlasterDiagonal,
  layers: [
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
    } satisfies LayerConfig,
    createMonolithicLayer(clayPlasterFine.id, 5, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ]
}

export const PRESET_WALL_LIME_PLASTER: LayerPreset = {
  nameKey: $ => $.layers.presets.limePlaster,
  layers: [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ]
}

export const PRESET_WALL_LIME_PLASTER_DHF: LayerPreset = {
  nameKey: $ => $.layers.presets.limePlasterDhf,
  layers: [
    createMonolithicLayer(dhf.id, 16, 'DHF', $ => $.layers.defaults.dhf),
    createMonolithicLayer(reed.id, 9, 'Plaster Ground (Reed)', $ => $.layers.defaults.plasterGroundReed, true),
    createMonolithicLayer(limePlasterBase.id, 10, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 4, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ]
}

export const PRESET_WALL_LIME_PLASTER_DIAGONAL: LayerPreset = {
  nameKey: $ => $.layers.presets.limePlasterDiagonal,
  layers: [
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
    } satisfies LayerConfig,
    createMonolithicLayer(limePlasterFine.id, 5, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ]
}

export const PRESET_WALL_WOODEN_PLANKING: LayerPreset = {
  nameKey: $ => $.layers.presets.woodenPlanking,
  layers: [
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
    } satisfies LayerConfig,
    createMonolithicLayer(boards.id, 25, 'Wood Planking', $ => $.layers.defaults.woodPlanking)
  ]
}

export const PRESET_WALL_WOODEN_PLANKING_DHF: LayerPreset = {
  nameKey: $ => $.layers.presets.woodenPlankingDhf,
  layers: [
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
    } satisfies LayerConfig,
    createMonolithicLayer(boards.id, 25, 'Wood Planking', $ => $.layers.defaults.woodPlanking)
  ]
}

export const PRESET_WALL_GYPSUM: LayerPreset = {
  nameKey: $ => $.layers.presets.gypsum,
  layers: [createMonolithicLayer(gypsum.id, 30, 'Gypsum Boards', $ => $.layers.defaults.gypsumBoards)]
}

// Floor layer presets
export const PRESET_FLOOR_SCREED: LayerPreset = {
  nameKey: $ => $.layers.presets.screed,
  layers: [
    createMonolithicLayer(
      impactSoundInsulation.id,
      25,
      'Impact Sound Insulation',
      $ => $.layers.defaults.impactSoundInsulation
    ),
    createMonolithicLayer(cementScreed.id, 35, 'Screed', $ => $.layers.defaults.screed)
  ]
}

// Ceiling layer presets
export const PRESET_CEILING_CLAY_PLASTER: LayerPreset = {
  nameKey: $ => $.layers.presets.clayPlaster,
  layers: [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)', $ => $.layers.defaults.clayPlasterBase),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)', $ => $.layers.defaults.clayPlasterFine)
  ]
}

export const PRESET_CEILING_LIME_PLASTER: LayerPreset = {
  nameKey: $ => $.layers.presets.limePlaster,
  layers: [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)', $ => $.layers.defaults.limePlasterBase),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)', $ => $.layers.defaults.limePlasterFine)
  ]
}

// Roof layer presets
export const PRESET_ROOF_TILES: LayerPreset = {
  nameKey: $ => $.layers.presets.tiles,
  layers: [
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
  ]
}

// Export lists for use in UI
export const WALL_LAYER_PRESETS: LayerPreset[] = [
  PRESET_WALL_CLAY_PLASTER,
  PRESET_WALL_CLAY_PLASTER_DIAGONAL,
  PRESET_WALL_LIME_PLASTER,
  PRESET_WALL_LIME_PLASTER_DHF,
  PRESET_WALL_LIME_PLASTER_DIAGONAL,
  PRESET_WALL_WOODEN_PLANKING,
  PRESET_WALL_WOODEN_PLANKING_DHF,
  PRESET_WALL_GYPSUM
]

export const FLOOR_LAYER_PRESETS: LayerPreset[] = [PRESET_FLOOR_SCREED]

export const CEILING_LAYER_PRESETS: LayerPreset[] = [PRESET_CEILING_CLAY_PLASTER, PRESET_CEILING_LIME_PLASTER]

export const ROOF_LAYER_PRESETS: LayerPreset[] = [PRESET_ROOF_TILES]
