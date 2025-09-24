import type { ConstructionType, PerimeterWallConstructionMethod } from './base'
import { constructInfillWall } from './infill/infill'
import { constructStrawhengeWall } from './strawhenge/strawhenge'
import type { NonStrawbaleConfig } from '@/shared/types/config'
import { createLength } from '@/shared/geometry'

export * from './base'
export * from './corners/corners'
export * from './infill/infill'
export * from '../materials/material'
export * from '../openings/openings'
export * from '../materials/posts'
export * from '../ringBeams/ringBeams'
export * from '../materials/straw'
export * from './strawhenge/strawhenge'

// Placeholder construction method for non-strawbale walls
const constructNonStrawbaleWall: PerimeterWallConstructionMethod<NonStrawbaleConfig> = (
  wall,
  _perimeter,
  floorHeight
) => {
  return {
    wallId: wall.id,
    constructionType: 'non-strawbale',
    wallDimensions: {
      length: wall.wallLength,
      boundaryLength: wall.wallLength,
      thickness: createLength(200), // 200mm default
      height: floorHeight
    },
    segments: [],
    measurements: [],
    cornerInfo: {
      startCorner: null,
      endCorner: null
    },
    errors: [],
    warnings: []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PERIMETER_WALL_CONSTRUCTION_METHODS: Record<ConstructionType, PerimeterWallConstructionMethod<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall,
  'non-strawbale': constructNonStrawbaleWall
}
