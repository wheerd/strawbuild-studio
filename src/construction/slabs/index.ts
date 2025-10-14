import type { SlabConstructionType } from '@/construction/config/types'

import { JoistConstructionMethod } from './joists'
import { MonolithicConstructionMethod } from './monolithic'
import type { SlabConstructionMethod } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SLAB_CONSTRUCTION_METHODS: Record<SlabConstructionType, SlabConstructionMethod<any>> = {
  monolithic: new MonolithicConstructionMethod(),
  joist: new JoistConstructionMethod()
}

export * from './types'
export * from './monolithic'
export * from './joists'
