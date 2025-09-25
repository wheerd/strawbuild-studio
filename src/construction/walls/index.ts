import type { NonStrawbaleConfig } from '@/construction/config/types'
import { createLength } from '@/shared/geometry'

import type { ConstructionType, PerimeterWallConstructionMethod } from './construction'
import { constructInfillWall } from './infill/infill'
import { constructStrawhengeWall } from './strawhenge/strawhenge'

// Re-export from new modular structure
export * from '@/construction/elements'
export * from '@/construction/results'
export * from '@/construction/measurements'
export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from '@/construction/materials/material'
export * from '@/construction/openings/openings'
export * from '@/construction/materials/posts'
export * from '@/construction/ringBeams/ringBeams'
export * from '@/construction/materials/straw'
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
