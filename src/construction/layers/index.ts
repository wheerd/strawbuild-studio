import { MonolithicLayerConstruction } from '@/construction/layers/monolithic'
import { StripedLayerConstruction } from '@/construction/layers/stripe'

import type { LayerConfig, LayerConstruction, LayerType } from './types'

export const FLOOR_ASSEMBLIES: { [TType in LayerType]: LayerConstruction<Extract<LayerConfig, { type: TType }>> } = {
  monolithic: new MonolithicLayerConstruction(),
  striped: new StripedLayerConstruction()
}
