import type { RingBeamConstructionMethodId } from './ids'
import type { RingBeamConfig } from '@/construction/ringBeams'

export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  config: RingBeamConfig
}
