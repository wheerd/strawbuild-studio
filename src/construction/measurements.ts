import type { Vec3 } from '@/shared/geometry'

import type { Tag } from './tags'

export interface Measurement {
  startPoint: Vec3
  endPoint: Vec3
  label: string
  groupKey?: string
  tags?: Tag[]
}
