import { type Polygon2D } from '@/shared/geometry'

import type { FloorAreaId, FloorOpeningId, StoreyId } from './ids'

export interface FloorArea {
  id: FloorAreaId
  storeyId: StoreyId
  area: Polygon2D
}

export interface FloorOpening {
  id: FloorOpeningId
  storeyId: StoreyId
  area: Polygon2D
}
