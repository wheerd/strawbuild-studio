import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import type { ConstructionElement, WithIssues } from './base'

export interface StrawConfig {
  baleLength: Length // Default: 800mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId
}

export const constructStraw = (position: Vec3, size: Vec3, _config: StrawConfig): WithIssues<ConstructionElement[]> => {
  throw new Error('TODO: Implementation')
}
