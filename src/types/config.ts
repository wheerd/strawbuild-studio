import type { MaterialId } from '@/construction'
import type { Length } from './geometry'
import type { RingBeamConstructionMethodId } from './ids'

export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  material: MaterialId
  height: Length
  width?: Length // If different from wall thickness
  offsetFromEdge?: Length // From inside construction edge of wall
}
