import {
  cementScreed,
  clayPlasterBase,
  clayPlasterFine,
  impactSoundInsulation,
  limePlasterBase,
  limePlasterFine,
  wood,
  woodPlanking
} from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const createMonolithicLayer = (material: MaterialId, thickness: Length, name: string): LayerConfig => ({
  type: 'monolithic',
  name,
  material,
  thickness
})

export const DEFAULT_WALL_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)')
  ],
  'Clay Plaster + Diagonal Bracing': [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      direction: 'diagonal',
      stripeMaterial: wood.id,
      stripeWidth: 150,
      gapMaterial: clayPlasterBase.id,
      gapWidth: 50,
      thickness: 24
    } satisfies LayerConfig,
    createMonolithicLayer(clayPlasterFine.id, 6, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)')
  ],
  'Lime Plaster + Diagonal Bracing': [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      direction: 'diagonal',
      stripeMaterial: wood.id,
      stripeWidth: 150,
      gapMaterial: limePlasterBase.id,
      gapWidth: 50,
      thickness: 24
    } satisfies LayerConfig,
    createMonolithicLayer(limePlasterFine.id, 6, 'Fine Plaster (Lime)')
  ],
  'Wooden Planking': [
    {
      type: 'striped',
      name: 'Battens',
      direction: 'perpendicular',
      stripeMaterial: wood.id,
      stripeWidth: 48,
      gapMaterial: clayPlasterBase.id,
      gapWidth: 500,
      thickness: 24
    } satisfies LayerConfig,
    {
      type: 'striped',
      name: 'Counter Battens',
      direction: 'colinear',
      stripeMaterial: wood.id,
      stripeWidth: 48,
      gapWidth: 500,
      thickness: 24
    } satisfies LayerConfig,
    createMonolithicLayer(woodPlanking.id, 25, 'Wood Planking')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_FLOOR_LAYER_SETS = {
  Screet: [
    createMonolithicLayer(impactSoundInsulation.id, 25, 'Impact Sound Insulation'),
    createMonolithicLayer(cementScreed.id, 35, 'Screed')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_CEILING_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_ROOF_LAYER_SETS = {
  Tiles: [
    createMonolithicLayer('material_invalid' as MaterialId, 1, 'Wind Paper'),
    {
      type: 'striped',
      direction: 'colinear',
      name: 'Battens',
      gapWidth: 500,
      thickness: 60,
      stripeMaterial: wood.id,
      stripeWidth: 60
    },
    {
      type: 'striped',
      direction: 'perpendicular',
      name: 'Counter Battens',
      gapWidth: 300,
      thickness: 30,
      stripeMaterial: wood.id,
      stripeWidth: 40
    },
    createMonolithicLayer('material_invalid' as MaterialId, 35, 'Tiles')
  ]
} satisfies Record<string, LayerConfig[]>
