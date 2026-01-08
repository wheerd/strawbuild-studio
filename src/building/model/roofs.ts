import { type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type { PerimeterId, RoofAssemblyId, RoofId, RoofOverhangId, StoreyId } from './ids'

export type RoofType = 'shed' | 'gable'

export interface RoofOverhang {
  id: RoofOverhangId
  sideIndex: number
  value: Length
  // Computed trapezoid geometry (4 points: innerStart, innerEnd, outerEnd, outerStart)
  area: Polygon2D
}

export interface Roof {
  id: RoofId
  storeyId: StoreyId
  type: RoofType
  referencePolygon: Polygon2D
  ridgeLine: LineSegment2D
  mainSideIndex: number
  slope: number // Angle in degrees
  // Added to the floorHeight of the storey to determine the highest point of the roof (outside)
  verticalOffset: Length
  overhangs: RoofOverhang[] // Overhang for each side with computed geometry
  assemblyId: RoofAssemblyId
  referencePerimeter?: PerimeterId

  // Computed
  overhangPolygon: Polygon2D
  slopeAngleRad: number
  ridgeDirection: Vec2
  downSlopeDirection: Vec2
  rise: Length
  span: Length
}
